import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import Product from '../../../models/Product.model.js';
import Coupon from '../../../models/Coupon.model.js';
import Commission from '../../../models/Commission.model.js';
import ReturnRequest from '../../../models/ReturnRequest.model.js';
import Admin from '../../../models/Admin.model.js';
import { generateOrderId } from '../../../utils/generateOrderId.js';
import { generateReturnId } from '../../../utils/generateReturnId.js';
import { generateTrackingNumber } from '../../../utils/generateTrackingNumber.js';
import mongoose from 'mongoose';
import { createNotification } from '../../../services/notification.service.js';
import { calculateVendorShippingForGroups } from '../../../services/vendorShipping.service.js';
import { emitEvent } from '../../../services/socket.service.js';
import { calculateDistance, getDeliveryEarning } from '../../../utils/geo.js';
import { validateAddressServiceability } from '../../../services/serviceArea.service.js';
import Vendor from '../../../models/Vendor.model.js';
import { OrderNotificationService } from '../../../services/orderNotification.service.js';
import { geocodeAddress, getDistanceMatrix } from '../../../services/googleMaps.service.js';
import { applyActiveCampaigns } from '../../../utils/productUtils.js';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const normalizeVariantPart = (value) => String(value || '').trim().toLowerCase();
const normalizeAxisName = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
const createDynamicVariantKey = (selection = {}) =>
    Object.entries(selection || {})
        .map(([axis, value]) => [normalizeAxisName(axis), normalizeVariantPart(value)])
        .filter(([axis, value]) => axis && value)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([axis, value]) => `${axis}=${value}`)
        .join('|');

const toVariantPriceEntries = (variantPrices) => {
    if (!variantPrices) return [];
    if (variantPrices instanceof Map) return Array.from(variantPrices.entries());
    if (typeof variantPrices === 'object') return Object.entries(variantPrices);
    return [];
};

const toVariantStockEntries = (stockMap) => {
    if (!stockMap) return [];
    if (stockMap instanceof Map) return Array.from(stockMap.entries());
    if (typeof stockMap === 'object') return Object.entries(stockMap);
    return [];
};

const resolveVariantSelection = (product, selectedVariant) => {
    const basePrice = Number(product?.price);
    if (!Number.isFinite(basePrice)) {
        throw new ApiError(400, `Invalid price configured for product ${product?.name || product?._id || ''}.`);
    }

    const priceEntries = toVariantPriceEntries(product?.variants?.prices);
    const stockEntries = toVariantStockEntries(product?.variants?.stockMap);
    
    // Resolve the best matching key from both Price and Stock maps
    const variantKey = resolveOrderItemVariantKey(product, { variant: selectedVariant });
    
    const sizes = Array.isArray(product?.variants?.sizes) ? product.variants.sizes : [];
    const colors = Array.isArray(product?.variants?.colors) ? product.variants.colors : [];
    const attributes = Array.isArray(product?.variants?.attributes) ? product.variants.attributes : [];
    const hasVariantAxes = sizes.length > 0 || colors.length > 0 || attributes.length > 0;

    if (variantKey) {
        // Try to find price for this key
        const priceMatch = priceEntries.find(([k]) => String(k).trim() === variantKey);
        const price = priceMatch ? Number(priceMatch[1]) : basePrice;
        
        return { 
            price: (Number.isFinite(price) && price >= 0) ? price : basePrice, 
            variantKey, 
            hasVariantAxes 
        };
    }

    // Fallback if no variant key resolved but product has variant axes
    return { price: basePrice, variantKey: null, hasVariantAxes };
};

const resolveOrderItemVariantKey = (product, orderItem) => {
    const explicitKey = String(orderItem?.variantKey || '').trim();
    if (explicitKey) return explicitKey;

    const stockEntries = toVariantStockEntries(product?.variants?.stockMap).map(([k]) => String(k).trim());
    const priceEntries = toVariantPriceEntries(product?.variants?.prices).map(([k]) => String(k).trim());
    const existingKeys = [...new Set([...stockEntries, ...priceEntries])];
    if (!existingKeys.length) return null;

    const dynamicSelection = Object.entries(orderItem?.variant || {}).reduce((acc, [axis, value]) => {
        const axisKey = normalizeAxisName(axis);
        const selectedValue = String(value || '').trim();
        if (axisKey && selectedValue) acc[axisKey] = selectedValue;
        return acc;
    }, {});
    const dynamicKey = createDynamicVariantKey(dynamicSelection);
    if (dynamicKey) {
        const exactDynamic = existingKeys.find((key) => key === dynamicKey);
        if (exactDynamic) return exactDynamic;
        const normalizedDynamic = existingKeys.find(
            (key) => normalizeVariantPart(key) === normalizeVariantPart(dynamicKey)
        );
        if (normalizedDynamic) return normalizedDynamic;
    }

    const size = normalizeVariantPart(orderItem?.variant?.size);
    const color = normalizeVariantPart(orderItem?.variant?.color);
    if (!size && !color) return null;

    const candidates = [
        [size && `size=${size}`, color && `color=${color}`].filter(Boolean).sort().join('|'),
        `${size}|${color}`,
        `${size}|`,
        `|${color}`,
        `${size}-${color}`,
        `${size}_${color}`,
        `${size}:${color}`,
        size && !color ? size : null,
        color && !size ? color : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
        const exact = existingKeys.find((key) => key === candidate);
        if (exact) return exact;
        const normalized = existingKeys.find((key) => normalizeVariantPart(key) === normalizeVariantPart(candidate));
        if (normalized) return normalized;
    }
    return null;
};

// POST /api/user/orders
export const placeOrder = asyncHandler(async (req, res) => {
    const { items, shippingAddress, paymentMethod, couponCode, shippingOption, orderType, deliveryType, deviceToken, dropoffLocation } = req.body;
    
    const userId = req.user?._id || req.user?.id;

    // 1. Check serviceability (Service is not yet delivered/available in the zone check)
    if (shippingAddress) {
        try {
            await validateAddressServiceability({
                pincode: shippingAddress.zipCode,
                city: shippingAddress.city,
                coordinates: dropoffLocation?.coordinates || null
            });
        } catch (error) {
            throw new ApiError(400, error.message || "Service is not yet available/delivered in this area. Please try another location.");
        }
    }

    console.log("STEP 3 - Received dropoffLocation:", dropoffLocation);

    // Validate order type
    const allowedOrderTypes = ['check_and_buy', 'try_and_buy'];
    if (!orderType || !allowedOrderTypes.includes(orderType)) {
        throw new ApiError(400, "Please select an order type: 'Check & Buy' or 'Try & Buy'.");
    }

    const normalizedPaymentMethod = paymentMethod === 'cash' ? 'cod' : paymentMethod;
    const rawIdempotencyKey = String(req.get('x-idempotency-key') || '').trim();
    const idempotencyKey = rawIdempotencyKey || null;
    const normalizedGuestEmail = String(shippingAddress?.email || '').trim().toLowerCase();
    const normalizedGuestPhone = String(shippingAddress?.phone || '').replace(/\D/g, '').slice(-10);
    const idempotencyScope = userId
        ? `user:${String(userId)}`
        : `guest:${normalizedGuestEmail || normalizedGuestPhone || 'anonymous'}`;

    if (idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
            .select('orderId total trackingNumber')
            .lean();
        if (existingOrder) {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        orderId: existingOrder.orderId,
                        total: existingOrder.total,
                        trackingNumber: existingOrder.trackingNumber,
                        idempotentReplay: true,
                    },
                    'Duplicate order request ignored. Returning existing order.'
                )
            );
        }
    }

    console.log(`\n--- 📦 [PLACE ORDER] ---`);
    console.log(`User/Guest: ${idempotencyScope}`);
    console.log(`Items: ${items.length}, Type: ${orderType}, Delivery: ${deliveryType}`);

    // 1. Validate items and calculate subtotal
    let subtotal = 0;
    const enrichedItems = [];
    const vendorMap = {};

    for (const item of items) {
        const productDoc = await Product.findById(item.productId).populate(
            'vendorId',
            'commissionRate storeName shippingEnabled defaultShippingRate freeShippingThreshold shopLocation isOnline'
        );

        if (!productDoc) {
            throw new ApiError(404, `Product not found: ${item.productId}`);
        }

        // Check if store is offline
        if (productDoc.vendorId && productDoc.vendorId.isOnline === false) {
            throw new ApiError(400, `The store "${productDoc.vendorId.storeName}" is currently offline. Orders cannot be placed at this time.`);
        }
        
        // Apply active campaigns to ensure order pricing matches catalog pricing
        const product = await applyActiveCampaigns(productDoc);
        
        console.log(`🛒 [ITEM] ${product.name} x${item.quantity}, Price: ${product.price}, Vendor: ${product.vendorId.storeName}`);

        if (product.stock === 'out_of_stock') throw new ApiError(400, `${product.name} is out of stock.`);
        if (product.stockQuantity < item.quantity) throw new ApiError(400, `Only ${product.stockQuantity} units of ${product.name} available.`);

        // Always trust server-side product pricing; never trust client-sent item.price.
        const { price: itemPrice, variantKey, hasVariantAxes } = resolveVariantSelection(product, item.variant);
        const variantStockValue = variantKey ? Number(product?.variants?.stockMap?.get?.(variantKey) ?? product?.variants?.stockMap?.[variantKey]) : null;
        if (hasVariantAxes && variantKey && Number.isFinite(variantStockValue) && variantStockValue < item.quantity) {
            throw new ApiError(400, `Only ${variantStockValue} units available for variant [${variantKey}] of ${product.name}. Please check stock in variants section.`);
        }
        const itemSubtotal = itemPrice * item.quantity;
        subtotal += itemSubtotal;

        const variantImage =
            variantKey
                ? String((product?.variants?.imageMap?.get?.(variantKey) ?? product?.variants?.imageMap?.[variantKey]) || '').trim()
                : '';
        const itemCommissionRate = product.vendorId.commissionRate || 0;
        const itemVendorPrice = product.vendorPrice || 0;
        const itemCommissionAmount = (itemVendorPrice * item.quantity * itemCommissionRate) / 100;
        const itemMarginAmount = (itemPrice - itemVendorPrice) * item.quantity;

        const enriched = {
            productId: product._id,
            vendorId: product.vendorId._id,
            name: product.name,
            image: variantImage || product.image,
            price: itemPrice,
            originalPrice: product.originalPrice || itemPrice,
            quantity: item.quantity,
            vendorPrice: itemVendorPrice,
            commissionRate: itemCommissionRate,
            commissionAmount: itemCommissionAmount,
            marginAmount: itemMarginAmount,
            variant: item.variant,
            variantKey: variantKey || undefined,
        };
        enrichedItems.push(enriched);

        // Group by vendor
        const vid = product.vendorId._id.toString();
        if (!vendorMap[vid]) {
            vendorMap[vid] = {
                vendorId: product.vendorId._id,
                vendorName: product.vendorId.storeName,
                commissionRate: product.vendorId.commissionRate || 10,
                shippingEnabled: product.vendorId.shippingEnabled !== false,
                defaultShippingRate: product.vendorId.defaultShippingRate,
                freeShippingThreshold: product.vendorId.freeShippingThreshold,
                items: [],
                subtotal: 0,
                basePrice: 0,
            };
        }
        vendorMap[vid].items.push(enriched);
        vendorMap[vid].subtotal += itemSubtotal;
        vendorMap[vid].basePrice += (itemVendorPrice * item.quantity);
        vendorMap[vid].shopLocation = product.vendorId.shopLocation;
    }
    console.log(`[OrderCalc] Subtotal: ₹${subtotal}, Vendors: ${Object.keys(vendorMap).length}`);

    // 2. Validate coupon
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
        if (!coupon) throw new ApiError(400, 'Invalid coupon code.');
        if (coupon.startsAt && coupon.startsAt > Date.now()) throw new ApiError(400, 'Coupon is not active yet.');
        if (coupon.expiresAt && coupon.expiresAt < Date.now()) throw new ApiError(400, 'Coupon has expired.');
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached.');
        if (subtotal < coupon.minOrderValue) throw new ApiError(400, `Minimum order value for this coupon is Rs.${coupon.minOrderValue}.`);

        if (coupon.type === 'percentage') {
            couponDiscount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
        } else if (coupon.type === 'fixed') {
            couponDiscount = coupon.value;
        }
        appliedCoupon = coupon;
    }

    // 3. Resolve Dropoff Location & Calculate distance-based shipping
    let dropoffCoords = req.body.dropoffLocation?.coordinates;
    const isInvalidCoords = !dropoffCoords || (dropoffCoords[0] === 0 && dropoffCoords[1] === 0);

    if (isInvalidCoords) {
        console.log(`🔍 [Geocoding] Missing coordinates. Attempting geocode for address...`);
        const fullAddress = `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}, ${shippingAddress.country}`;
        const geocoded = await geocodeAddress(fullAddress);
        if (geocoded) {
            console.log(`✅ [Geocoding] Success:`, geocoded);
            dropoffCoords = geocoded;
        } else {
            console.warn(`❌ [Geocoding] No results. Falling back to [0, 0].`);
            dropoffCoords = [0, 0];
        }
    }

    // 3. Calculate Shipping using centralized service
    const { totalShipping, shippingByVendor, distanceByVendor } = await calculateVendorShippingForGroups({
        vendorGroups: Object.values(vendorMap).map(v => ({
            vendorId: v.vendorId,
            subtotal: v.subtotal,
            shippingEnabled: v.shippingEnabled,
            defaultShippingRate: v.defaultShippingRate,
            freeShippingThreshold: v.freeShippingThreshold,
            shopLocation: v.shopLocation
        })),
        shippingAddress: {
            ...shippingAddress,
            coordinates: dropoffCoords
        },
        shippingOption: 'online',
        couponType: appliedCoupon?.type
    });

    const shipping = totalShipping;
    const maxDistanceToCustomer = Math.max(...Object.values(distanceByVendor || { default: 0 }));

    // 4. Calculate final totals
    const tax = 0; // Tax is currently 0 as per user requirements
    const platformFee = 20; // Standard platform fee
    const total = parseFloat((subtotal - couponDiscount + shipping + tax + platformFee).toFixed(2));
    
    console.log(`💰 [TOTALS] Subtotal: ₹${subtotal}, Shipping: ₹${shipping}, Discount: ₹${couponDiscount}, Tax: ₹${tax}, Grand Total: ₹${total}`);


    // 5. Build vendor item groups
    const vendorItems = Object.values(vendorMap).map((v) => {
        const vendorCommissionAmount = v.items.reduce((sum, item) => sum + (item.commissionAmount || 0), 0);
        const vendorMarginAmount = v.items.reduce((sum, item) => sum + (item.marginAmount || 0), 0);

        return {
            vendorId: v.vendorId,
            vendorName: v.vendorName,
            items: v.items,
            subtotal: v.subtotal,
            basePrice: v.basePrice,
            shipping: Number(shippingByVendor[String(v.vendorId)] || 0),
            distance: v.distance || 0,
            tax: 0,
            discount: 0,
            commissionRate: v.commissionRate,
            commissionAmount: vendorCommissionAmount,
            vendorEarnings: parseFloat((v.subtotal - vendorCommissionAmount - vendorMarginAmount).toFixed(2)),
            status: 'pending',
        };
    });

    // 6-9. Transactional order creation to avoid partial writes.
    let order = null;
    let idempotentReplay = false;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            if (idempotencyKey) {
                const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
                    .select('orderId total trackingNumber')
                    .session(session);
                if (existingOrder) {
                    order = existingOrder;
                    idempotentReplay = true;
                    return;
                }
            }

            const [createdOrder] = await Order.create([{
                orderId: generateOrderId(),
                userId,
                items: enrichedItems,
                vendorItems,
                shippingAddress,
                paymentMethod: normalizedPaymentMethod,
                // Keep every new order pending until gateway/webhook confirmation is implemented.
                paymentStatus: 'pending',
                subtotal,
                shipping,
                tax,
                discount: couponDiscount,
                platformFee,
                total,
                couponCode: couponCode?.toUpperCase(),
                couponDiscount,
                orderType,
                pickupLocation: Object.values(vendorMap)[0]?.shopLocation || { type: 'Point', coordinates: [0, 0] },
                dropoffLocation: { type: 'Point', coordinates: dropoffCoords },
                deliveryDistance: maxDistanceToCustomer,
                deliveryEarnings: getDeliveryEarning(maxDistanceToCustomer),
                trackingNumber: generateTrackingNumber(),
                estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
                idempotencyKey: idempotencyKey || undefined,
                idempotencyScope: idempotencyKey ? idempotencyScope : undefined,
                deviceToken: deviceToken || undefined,
            }], { session });

            order = createdOrder;
            console.log("STEP 4 - Saved order.customerLocation:", order.dropoffLocation);

            // Step 4.5: Decrement stock and update stock status
            for (const item of enrichedItems) {
                const quantity = Number(item.quantity || 0);
                const variantKey = item.variantKey;

                const incUpdate = { stockQuantity: -quantity };
                if (variantKey) {
                    // Note: This works for Map-based stockMap as well in modern Mongoose/MongoDB
                    incUpdate[`variants.stockMap.${variantKey}`] = -quantity;
                }

                const queryFilter = { _id: item.productId, stockQuantity: { $gte: quantity } };
                if (variantKey) {
                    queryFilter[`variants.stockMap.${variantKey}`] = { $gte: quantity };
                }

                const updatedProduct = await Product.findOneAndUpdate(
                    queryFilter,
                    { $inc: incUpdate },
                    { new: true, session }
                );

                if (!updatedProduct) {
                    const currentProduct = await Product.findById(item.productId).session(session);
                    const availableTotal = currentProduct?.stockQuantity || 0;
                    const availableVariant = variantKey ? (currentProduct?.variants?.stockMap?.get?.(variantKey) ?? currentProduct?.variants?.stockMap?.[variantKey]) : 'N/A';
                    
                    throw new ApiError(400, `Stock changed for ${item.name}. Requested: ${quantity}, Available Total: ${availableTotal}, Available Variant [${variantKey || 'None'}]: ${availableVariant}. Please refresh and try again.`);
                }

                if (updatedProduct) {
                    const nextStockState =
                        updatedProduct.stockQuantity <= 0
                            ? 'out_of_stock'
                            : (updatedProduct.stockQuantity <= (updatedProduct.lowStockThreshold || 10) ? 'low_stock' : 'in_stock');

                    await Product.updateOne(
                        { _id: updatedProduct._id },
                        { $set: { stock: nextStockState } },
                        { session }
                    );
                }
            }

            // If payment method is prepaid, create Razorpay order
            if (normalizedPaymentMethod === 'prepaid') {
                try {
                    const razorpayOrder = await razorpay.orders.create({
                        amount: Math.round(total * 100), // Razorpay expects amount in paise
                        currency: 'INR',
                        receipt: order.orderId,
                    });
                    
                    order.razorpayOrderId = razorpayOrder.id;
                    await order.save({ session });
                } catch (razorError) {
                    console.error("❌ RAZORPAY_ORDER_CREATION_FAILED:", razorError);
                    throw new ApiError(500, "Failed to initialize online payment. Please try again.");
                }
            }
        });

        // 10. Unified Notification to all parties (CALLED OUTSIDE TRANSACTION)
        if (order && !idempotentReplay) {
            console.log("STEP 5 - Emitting Order:", order);
            OrderNotificationService.notifyOrderUpdate(order._id, 'pending', {
                excludeRecipientId: userId,
                title: 'New Order Received!',
                message: `You have a new ${orderType?.replace(/_/g, ' ') || 'order'} of Rs.${order.total}.`
            }).catch(err => console.error('[OrderDebug] Notification failed:', err));
        }
    } catch (err) {
        if (idempotencyKey && err?.code === 11000) {
            const existingOrder = await Order.findOne({ idempotencyScope, idempotencyKey })
                .select('orderId total trackingNumber')
                .lean();
            if (existingOrder) {
                order = existingOrder;
                idempotentReplay = true;
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    } finally {
        await session.endSession();
    }

    const responseStatus = idempotentReplay ? 200 : 201;
    const responseMessage = idempotentReplay
        ? 'Duplicate order request ignored. Returning existing order.'
        : 'Order placed successfully.';
    console.log("📤 Sending Order Response Data:", {
        orderId: order.orderId,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
    res.status(responseStatus).json(
        new ApiResponse(
            responseStatus,
            {
                orderId: order.orderId,
                total: order.total,
                trackingNumber: order.trackingNumber,
                razorpayOrderId: order.razorpayOrderId,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                ...(idempotentReplay ? { idempotentReplay: true } : {}),
            },
            responseMessage
        )
    );
});

// POST /api/user/orders/verify-payment
export const verifyPayment = asyncHandler(async (req, res) => {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        throw new ApiError(400, "Missing payment verification details.");
    }

    const order = await Order.findOne({ orderId });
    if (!order) throw new ApiError(404, "Order not found.");

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
        order.paymentStatus = 'failed';
        await order.save();
        throw new ApiError(400, "Invalid payment signature. Payment verification failed.");
    }

    // Update order status
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    
    // Auto-confirm order if it was pending
    if (order.status === 'pending') {
        order.status = 'pending'; // Keep as pending, but mark as paid
    }
    
    await order.save();

    res.status(200).json(new ApiResponse(200, { orderId: order.orderId }, "Payment verified successfully."));
});

// GET /api/user/orders
export const getUserOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    console.log(`[OrderDebug] Fetching all orders for user: ${req.user.id}`);
    const orders = await Order.find({ userId: req.user.id }).populate('deliveryBoyId', 'currentLocation name phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    const total = await Order.countDocuments({ userId: req.user.id });
    console.log(`[OrderDebug] Found ${orders.length}/${total} orders in DB for user ${req.user.id}.`);
    res.status(200).json(new ApiResponse(200, { orders, total, page: Number(page), pages: Math.ceil(total / limit) }, 'Orders fetched.'));
});

// GET /api/user/orders/:id
export const getOrderDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[OrderDebug] Fetching order detail: ${id} for user: ${req.user.id}`);

    let filter = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
        filter._id = id;
    } else {
        filter.orderId = id;
    }

    const order = await Order.findOne({ ...filter, userId: req.user.id })
        .populate('deliveryBoyId', 'currentLocation name phone')
        .select('+deliveryOtpDebug');

    if (!order) {
        console.warn(`[OrderDebug] Order not found for user: ${req.user.id} with identifier: ${id}. Checking if it exists at all...`);
        const anyOrder = await Order.findOne(filter);
        if (anyOrder) {
            console.warn(`[OrderDebug] Order exists but belongs to a different userId: ${anyOrder.userId || 'GUEST'}`);
        } else {
            console.error(`[OrderDebug] Order NO-EXIST at all in DB for identifier: ${id}`);
        }
        throw new ApiError(404, 'Order not found.');
    }

    res.status(200).json(new ApiResponse(200, order, 'Order detail fetched.'));
});

// PATCH /api/user/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const order = await Order.findOne({ orderId: req.params.id, userId: req.user.id }).session(session);
            if (!order) throw new ApiError(404, 'Order not found.');
            if (!['pending', 'processing'].includes(order.status)) throw new ApiError(400, 'Order cannot be cancelled at this stage.');

            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.cancellationReason = req.body.reason || 'Cancelled by customer';
            if (Array.isArray(order.vendorItems)) {
                order.vendorItems = order.vendorItems.map((vendorGroup) => ({
                    ...vendorGroup.toObject(),
                    status: 'cancelled',
                }));
            }
            await order.save({ session });

            // Restore stock and status
            for (const item of order.items) {
                const quantity = Number(item.quantity || 0);
                if (quantity <= 0) continue;

                const productSnapshot = await Product.findById(item.productId)
                    .select('variants.stockMap variants.prices')
                    .session(session)
                    .lean();
                const variantKey = resolveOrderItemVariantKey(productSnapshot, item);

                const incUpdate = { stockQuantity: quantity };
                if (variantKey) {
                    incUpdate[`variants.stockMap.${variantKey}`] = quantity;
                }

                const product = await Product.findByIdAndUpdate(item.productId, { $inc: incUpdate }, { new: true, session });
                if (!product) continue;

                const nextStockState =
                    product.stockQuantity <= 0
                        ? 'out_of_stock'
                        : (product.stockQuantity <= product.lowStockThreshold ? 'low_stock' : 'in_stock');

                await Product.updateOne(
                    { _id: product._id },
                    { $set: { stock: nextStockState } },
                    { session }
                );
            }

            // Reverse vendor earnings visibility for this order.
            await Commission.updateMany(
                {
                    orderId: order._id,
                    status: { $ne: 'cancelled' },
                },
                {
                    $set: {
                        status: 'cancelled',
                        paidAt: null,
                        settlementId: null,
                    },
                },
                { session }
            );
        });
        
        // Unified Notification to all parties
        await OrderNotificationService.notifyOrderUpdate(order._id, 'cancelled', {
            excludeRecipientId: req.user.id,
            title: `Order #${order.orderId} Cancelled`,
            message: `Order ${order.orderId} has been cancelled by the customer.`
        });
    } finally {
        await session.endSession();
    }

    res.status(200).json(new ApiResponse(200, null, 'Order cancelled successfully.'));
});

const normalizeReturnRequest = (requestDoc) => {
    const request = typeof requestDoc?.toObject === 'function' ? requestDoc.toObject() : requestDoc;
    const orderOrderId = request?.orderId?.orderId || '';
    const orderRefId = request?.orderId?._id || request?.orderId || null;
    return {
        ...request,
        id: request.returnId || String(request?._id || ''),
        orderId: orderOrderId || String(orderRefId || ''),
        orderRefId: orderRefId ? String(orderRefId) : null,
        requestDate: request?.createdAt,
    };
};

// POST /api/user/orders/:id/returns
export const createReturnRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log('--- CREATE RETURN REQUEST ---', { orderId: id, body: req.body });

    const order = await Order.findOne({
        $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { orderId: id }],
        userId: req.user.id,
    });

    if (!order) {
        console.log('Order not found or access denied', { id, userId: req.user.id });
        throw new ApiError(404, 'Order not found.');
    }

    const orderStatusNormalized = String(order.status || '').toLowerCase();
    if (orderStatusNormalized !== 'delivered') {
        throw new ApiError(400, 'Return can only be requested for delivered orders.');
    }

    // New Requirement: Only allow returns for check_and_buy order type
    if (order.orderType !== 'check_and_buy') {
        throw new ApiError(400, 'Returns are only permitted for "Check & Buy" orders. "Try & Buy" orders are non-returnable after delivery.');
    }

    // Check 24-hour validity
    if (order.deliveredAt) {
        const deliveredDate = new Date(order.deliveredAt);
        const now = new Date();
        const diffInHours = (now - deliveredDate) / (1000 * 60 * 60);
        
        if (diffInHours > 24) {
            throw new ApiError(400, 'Return validity has expired. Returns must be requested within 24 hours of delivery.');
        }
    } else {
        // Fallback if deliveredAt is missing (unlikely but safe)
        const updatedDate = new Date(order.updatedAt);
        const now = new Date();
        const diffInHours = (now - updatedDate) / (1000 * 60 * 60);
        if (diffInHours > 24) {
             throw new ApiError(400, 'Return validity has expired. Returns must be requested within 24 hours of delivery.');
        }
    }

    const requestedVendorId = String(req.body.vendorId || '').trim();
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const orderVendorIds = [...new Set(orderItems.map((item) => String(item?.vendorId || '')).filter(Boolean))];

    let vendorId = requestedVendorId;
    if (!vendorId) {
        if (orderVendorIds.length > 1) {
            throw new ApiError(400, 'vendorId is required for multi-vendor orders.');
        }
        vendorId = orderVendorIds[0] || '';
    }
    if (!vendorId) {
        throw new ApiError(400, 'Unable to resolve vendor for return request.');
    }

    const vendorScopedItems = orderItems.filter((item) => String(item?.vendorId || '') === vendorId);
    if (vendorScopedItems.length === 0) {
        throw new ApiError(400, 'Selected vendor has no items in this order.');
    }

    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    let normalizedItems = [];

    if (requestedItems.length > 0) {
        normalizedItems = requestedItems.map((inputItem) => {
            const productId = String(inputItem?.productId || '');
            const orderItem = vendorScopedItems.find((it) => String(it?.productId || '') === productId);
            if (!orderItem) {
                throw new ApiError(400, `Product ${productId} is not valid for this return request.`);
            }

            const requestedQty = Number(inputItem?.quantity || 0);
            const maxQty = Number(orderItem?.quantity || 0);
            if (!Number.isFinite(requestedQty) || requestedQty <= 0 || requestedQty > maxQty) {
                throw new ApiError(400, `Invalid quantity for product ${orderItem.name || productId}.`);
            }

            return {
                productId: orderItem.productId,
                name: orderItem.name,
                quantity: requestedQty,
                reason: String(inputItem?.reason || req.body.reason || '').trim(),
            };
        });
    } else {
        normalizedItems = vendorScopedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: Number(item.quantity || 1),
            reason: String(req.body.reason || '').trim(),
        }));
    }

    const existingOpen = await ReturnRequest.findOne({
        orderId: order._id,
        userId: req.user.id,
        vendorId,
        status: { $in: ['pending', 'approved', 'processing'] },
    });
    if (existingOpen) {
        throw new ApiError(409, 'An active return request already exists for this vendor in the selected order.');
    }

    const refundAmount = normalizedItems.reduce((sum, item) => {
        const orderItem = vendorScopedItems.find((it) => String(it?.productId || '') === String(item.productId || ''));
        const unitPrice = Number(orderItem?.price || 0);
        return sum + unitPrice * Number(item.quantity || 0);
    }, 0);

    const request = await ReturnRequest.create({
        orderId: order._id,
        returnId: generateReturnId(),
        userId: req.user.id,
        vendorId,
        items: normalizedItems,
        reason: String(req.body.reason || '').trim(),
        status: 'pending',
        refundAmount: Number(refundAmount.toFixed(2)),
        refundStatus: 'pending',
        images: Array.isArray(req.body.images) ? req.body.images : [],
    });

    // Update order status to reflect the return request
    order.status = 'return requested';
    await order.save();

    // 10. Unified Notifications for Return Request
    const adminNotificationTask = Admin.find({ isActive: true }).then(admins => 
        Promise.all(admins.map(admin => 
            createNotification({
                recipientId: admin._id,
                recipientType: 'admin',
                title: 'New Return Request',
                message: `Order #${order.orderId} has a new return request.`,
                type: 'order',
                data: { returnRequestId: String(request._id), orderId: String(order.orderId) }
            })
        ))
    );

    const vendorNotificationTask = createNotification({
        recipientId: vendorId,
        recipientType: 'vendor',
        title: 'New Return Request Received',
        message: `Customer requested a return for Order #${order.orderId}.`,
        type: 'order',
        data: { returnRequestId: String(request._id), orderId: String(order.orderId) }
    });

    await Promise.all([adminNotificationTask, vendorNotificationTask]);

    const populated = await ReturnRequest.findById(request._id)
        .populate('orderId', 'orderId total createdAt')
        .populate('vendorId', 'storeName email');

    res.status(201).json(new ApiResponse(201, normalizeReturnRequest(populated), 'Return request submitted successfully.'));
});

// GET /api/user/returns
export const getUserReturnRequests = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const numericPage = Math.max(1, Number(page) || 1);
    const numericLimit = Math.max(1, Number(limit) || 20);
    const filter = { userId: req.user.id };
    if (status && status !== 'all') filter.status = status;

    const [requests, total] = await Promise.all([
        ReturnRequest.find(filter)
            .populate('orderId', 'orderId total createdAt')
            .populate('vendorId', 'storeName email')
            .sort({ createdAt: -1 })
            .skip((numericPage - 1) * numericLimit)
            .limit(numericLimit),
        ReturnRequest.countDocuments(filter),
    ]);

    res.status(200).json(new ApiResponse(200, {
        returnRequests: requests.map(normalizeReturnRequest),
        pagination: {
            total,
            page: numericPage,
            limit: numericLimit,
            pages: Math.ceil(total / numericLimit),
        },
    }, 'Return requests fetched.'));
});

// GET /api/user/returns/:id
export const getUserReturnRequestById = asyncHandler(async (req, res) => {
    const request = await ReturnRequest.findOne({ _id: req.params.id, userId: req.user.id })
        .populate('orderId', 'orderId total createdAt')
        .populate('vendorId', 'storeName email');
    if (!request) throw new ApiError(404, 'Return request not found.');
    res.status(200).json(new ApiResponse(200, normalizeReturnRequest(request), 'Return request fetched.'));
});

// POST /api/user/orders/:id/resend-delivery-otp
// Customer requests a new delivery OTP (e.g. the previous one expired or SMS didn't arrive)
export const resendDeliveryOtp = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let filter = { userId: req.user.id };
    if (mongoose.Types.ObjectId.isValid(id)) {
        filter._id = id;
    } else {
        filter.orderId = id;
    }

    const order = await Order.findOne(filter).select('+deliveryOtpHash +deliveryOtpExpiry +deliveryOtpSentAt +deliveryOtpAttempts +deliveryOtpDebug');
    if (!order) throw new ApiError(404, 'Order not found.');

    const allowedStatuses = ['picked_up', 'out_for_delivery'];
    if (!allowedStatuses.includes(order.status)) {
        throw new ApiError(409, 'Delivery OTP can only be resent when your order is out for delivery.');
    }

    // Cooldown: 60 seconds between resends
    const RESEND_COOLDOWN_MS = 60 * 1000;
    if (order.deliveryOtpSentAt && new Date(order.deliveryOtpSentAt).getTime() + RESEND_COOLDOWN_MS > Date.now()) {
        const waitSec = Math.ceil((new Date(order.deliveryOtpSentAt).getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000);
        throw new ApiError(429, `Please wait ${waitSec}s before requesting another OTP.`);
    }

    // Generate new OTP
    const crypto = await import('crypto');
    const secret = process.env.JWT_SECRET || 'delivery-otp-secret';
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = crypto.default.createHash('sha256').update(`${otp}:${secret}`).digest('hex');

    order.deliveryOtpHash = hash;
    order.deliveryOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    order.deliveryOtpSentAt = new Date();
    order.deliveryOtpAttempts = 0;

    const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    if (!IS_PROD) {
        order.deliveryOtpDebug = otp;
    }

    await order.save();

    // Send OTP via email to the customer
    const { sendEmail } = await import('../../../services/email.service.js');
    const { sendDeliveryOtpSms } = await import('../../../services/sms.service.js');
    const { createNotification } = await import('../../../services/notification.service.js');

    const email = String(order?.shippingAddress?.email || '').trim().toLowerCase();
    const phone = String(order?.shippingAddress?.phone || '').replace(/\D/g, '').slice(-10);

    if (email) {
        await sendEmail({
            to: email,
            subject: `New Delivery OTP for order ${order.orderId || order._id}`,
            text: `Your new delivery verification OTP is ${otp}. Share it with the delivery partner only after receiving your order. It expires in 10 minutes.`,
            html: `<p>Your new delivery verification OTP is <strong>${otp}</strong>.</p><p>Share it with the delivery partner only after receiving your order.</p><p>This OTP expires in 10 minutes.</p>`,
        }).catch(err => console.warn('[User Resend OTP] Email failed:', err.message));
    }

    if (phone) {
        await sendDeliveryOtpSms(phone, otp).catch(e => console.warn('[User Resend OTP] SMS failed:', e.message));
    }

    // Push Notification
    createNotification({
        recipientId: order.userId,
        recipientType: 'user',
        title: 'New Delivery OTP',
        message: `Your new delivery OTP is ${otp}. Share it only with the delivery partner arrival.`,
        type: 'order',
        data: { orderId: order.orderId, otp: otp }
    }).catch(err => console.error('[User Resend OTP] Push Error:', err));

    // Emit socket event so the user-side UI updates with the new OTP immediately
    const { emitEvent: emit } = await import('../../../services/socket.service.js');
    emit(`user_${req.user.id}`, 'delivery_otp_resent', {
        orderId: order.orderId || order._id,
        deliveryOtpDebug: IS_PROD ? undefined : otp,
    });

    res.status(200).json(new ApiResponse(200, {
        deliveryOtpDebug: IS_PROD ? undefined : otp,
    }, 'New delivery OTP sent successfully.'));
});
