import Campaign from '../models/Campaign.model.js';

/**
 * Applies active campaigns to products.
 *
 * PRICING HIERARCHY (source of truth):
 *   1. Admin sets `price` (the final selling price) and per-variant prices in `variants.prices`.
 *   2. `originalPrice` is the MRP — used ONLY for strikethrough display, never as a discount base.
 *   3. Campaign discounts are applied ON TOP of the admin's selling price (`price` / variant prices),
 *      further reducing the price. They never increase it above what admin set.
 *
 * @param {Object|Array} productsInput - Single product or array (Mongoose docs or plain objects)
 * @returns {Promise<Object|Array>} - Products with campaign-adjusted pricing
 */
export const applyActiveCampaigns = async (productsInput) => {
    if (!productsInput) return productsInput;
    const isArray = Array.isArray(productsInput);
    const products = isArray ? productsInput : [productsInput];
    if (products.length === 0) return productsInput;

    const now = new Date();
    const activeCampaigns = await Campaign.find({
        isActive: true,
        $and: [
            { $or: [{ startDate: null }, { startDate: { $exists: false } }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }] }
        ]
    }).select('productIds discountType discountValue type').lean();

    if (!activeCampaigns.length) return productsInput;

    const discountMap = {};
    activeCampaigns.forEach(campaign => {
        if (!campaign.productIds) return;
        campaign.productIds.forEach(pidStr => {
            const pid = String(pidStr);
            if (!discountMap[pid]) discountMap[pid] = [];
            discountMap[pid].push(campaign);
        });
    });

    const result = products.map(p => {
        const obj = typeof p.toObject === 'function' ? p.toObject() : p;
        const pid = String(obj._id);
        const campaignsForProduct = discountMap[pid];

        if (campaignsForProduct && campaignsForProduct.length > 0) {
            const camp = campaignsForProduct[0];

            // ─── Base price is the admin's selling price, NOT the MRP ───
            const adminSellingPrice = Number(obj.price);
            const mrp = Number(obj.originalPrice || adminSellingPrice);

            let discountedPrice = adminSellingPrice;
            if (camp.discountType === 'percentage') {
                discountedPrice = Math.round(adminSellingPrice * (1 - camp.discountValue / 100));
            } else if (camp.discountType === 'fixed') {
                discountedPrice = Math.max(0, adminSellingPrice - camp.discountValue);
            }

            // Never let the campaign price exceed the admin-set price
            discountedPrice = Math.min(discountedPrice, adminSellingPrice);

            obj.originalPrice = mrp;             // MRP stays for strikethrough
            obj.price = discountedPrice;          // Actual selling price after campaign
            obj.discountedPrice = discountedPrice;
            obj.hasActiveCampaign = true;
            obj.campaignType = camp.type;

            // ─── Propagate same % / fixed discount to every variant price ───
            if (obj.variants && obj.variants.prices) {
                const prices = obj.variants.prices;
                const priceEntries = prices instanceof Map
                    ? Array.from(prices.entries())
                    : Object.entries(prices);

                const updatedPrices = {};
                priceEntries.forEach(([key, val]) => {
                    const vAdminPrice = Number(val);
                    if (!Number.isFinite(vAdminPrice)) return;

                    let vDiscounted = vAdminPrice;
                    if (camp.discountType === 'percentage') {
                        vDiscounted = Math.round(vAdminPrice * (1 - camp.discountValue / 100));
                    } else if (camp.discountType === 'fixed') {
                        vDiscounted = Math.max(0, vAdminPrice - camp.discountValue);
                    }
                    // Never exceed the admin-set variant price
                    updatedPrices[key] = Math.min(vDiscounted, vAdminPrice);
                });
                obj.variants.prices = updatedPrices;
            }
        }
        return obj;
    });

    return isArray ? result : result[0];
};
