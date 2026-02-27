import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import * as catalogController from '../controllers/catalog.controller.js';
import * as orderController from '../controllers/order.controller.js';
import * as vendorController from '../controllers/vendor.controller.js';
import * as customerController from '../controllers/customer.controller.js';
import * as deliveryController from '../controllers/delivery.controller.js';
import * as returnController from '../controllers/return.controller.js';
import * as supportController from '../controllers/support.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import * as marketingController from '../controllers/marketing.controller.js';
import * as reportController from '../controllers/report.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize, enforceAccountStatus, checkPermission } from '../../../middlewares/authorize.js';
import { authLimiter } from '../../../middlewares/rateLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import { uploadSingle } from '../../../middlewares/upload.js';
import { refreshTokenSchema, logoutSchema } from '../validators/auth.validator.js';
import {
    createProductSchema,
    updateProductSchema,
    taxPricingRulesSchema,
    categoryIdParamSchema,
    createCategorySchema,
    updateCategorySchema,
    reorderCategoriesSchema,
    brandIdParamSchema,
    createBrandSchema,
    updateBrandSchema,
} from '../validators/catalog.validator.js';
import {
    customerListQuerySchema,
    customerIdParamSchema,
    customerUpdateSchema,
    customerStatusUpdateSchema,
    customerAddressParamsSchema,
    customerOrdersQuerySchema,
    customerTransactionsQuerySchema,
    customerAddressesQuerySchema,
} from '../validators/customer.validator.js';
import {
    deliveryListQuerySchema,
    deliveryBoyIdParamSchema,
    createDeliveryBoySchema,
    updateDeliveryBoySchema,
    updateDeliveryStatusSchema,
    updateDeliveryApplicationStatusSchema,
    settleCashSchema,
} from '../validators/delivery.validator.js';
import {
    vendorListQuerySchema,
    vendorIdParamSchema,
    vendorStatusUpdateSchema,
    vendorCommissionUpdateSchema,
    vendorCommissionsQuerySchema,
    registerVendorSchema,
} from '../validators/vendor.validator.js';
import {
    marketingIdParamSchema,
    campaignListQuerySchema,
} from '../validators/marketing.validator.js';

const router = Router();
const adminAuth = [authenticate, authorize('admin', 'superadmin', 'employee'), enforceAccountStatus];
const superAdminOnly = [authenticate, authorize('superadmin'), enforceAccountStatus];
const adminManager = [authenticate, authorize('admin', 'superadmin'), enforceAccountStatus];

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authLimiter, authController.login);
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/auth/logout', validate(logoutSchema), authController.logout);
router.get('/auth/profile', ...adminAuth, authController.getProfile);

// ─── Employee Management ──────────────────────────────────────────────────────
router.get('/employees', ...adminManager, employeeController.getAllEmployees);
router.post('/employees', ...adminManager, employeeController.createEmployee);
router.put('/employees/:id', ...adminManager, employeeController.updateEmployee);
router.delete('/employees/:id', ...adminManager, employeeController.deleteEmployee);

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics/dashboard', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getDashboardStats);
router.get('/analytics/revenue', ...adminAuth, checkPermission('finance_view'), analyticsController.getRevenueData);
router.get('/analytics/order-status', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getOrderStatusBreakdown);
router.get('/analytics/top-products', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getTopProducts);
router.get('/analytics/customer-growth', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getCustomerGrowth);
router.get('/analytics/recent-orders', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getRecentOrders);
router.get('/analytics/sales', ...adminAuth, checkPermission('finance_view'), analyticsController.getSalesData);
router.get('/analytics/finance-summary', ...adminAuth, checkPermission('finance_view'), analyticsController.getFinancialSummary);
router.get('/analytics/inventory-stats', ...adminAuth, checkPermission('dashboard_view'), analyticsController.getInventoryStats);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/orders', ...adminAuth, checkPermission('orders_manage'), orderController.getAllOrders);
router.get('/orders/:id', ...adminAuth, checkPermission('orders_manage'), orderController.getOrderById);
router.patch('/orders/:id/status', ...adminAuth, checkPermission('orders_manage'), orderController.updateOrderStatus);
router.patch('/orders/:id/assign-delivery', ...adminAuth, checkPermission('orders_manage'), orderController.assignDeliveryBoy);
router.delete('/orders/:id', ...adminAuth, checkPermission('orders_manage'), orderController.deleteOrder);

// ─── Products ─────────────────────────────────────────────────────────────────
router.get('/products', ...adminAuth, checkPermission('products_manage'), catalogController.getAllProducts);
router.get('/products/tax-pricing-rules', ...adminAuth, checkPermission('products_manage'), catalogController.getTaxPricingRules);
router.get('/products/:id', ...adminAuth, checkPermission('products_manage'), catalogController.getProductById);
router.post('/products', ...adminAuth, checkPermission('products_manage'), validate(createProductSchema), catalogController.createProduct);
router.put('/products/tax-pricing-rules', ...adminAuth, checkPermission('products_manage'), validate(taxPricingRulesSchema), catalogController.updateTaxPricingRules);

router.put('/products/:id', ...adminAuth, checkPermission('products_manage'), validate(updateProductSchema), catalogController.updateProduct);
router.patch('/products/:id/approval-status', ...adminAuth, checkPermission('products_manage'), catalogController.updateProductStatus);
router.delete('/products/:id', ...adminAuth, checkPermission('products_manage'), catalogController.deleteProduct);

// ─── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', ...adminAuth, checkPermission('categories_manage'), catalogController.getAllCategories);
router.post('/categories', ...adminAuth, checkPermission('categories_manage'), validate(createCategorySchema), catalogController.createCategory);
router.patch('/categories/reorder', ...adminAuth, checkPermission('categories_manage'), validate(reorderCategoriesSchema), catalogController.reorderCategories);
router.put('/categories/:id', ...adminAuth, checkPermission('categories_manage'), validate(categoryIdParamSchema, 'params'), validate(updateCategorySchema), catalogController.updateCategory);
router.delete('/categories/:id', ...adminAuth, checkPermission('categories_manage'), validate(categoryIdParamSchema, 'params'), catalogController.deleteCategory);

// ─── Brands ───────────────────────────────────────────────────────────────────
router.get('/brands', ...adminAuth, checkPermission('brands_manage'), catalogController.getAllBrands);
router.post('/brands', ...adminAuth, checkPermission('brands_manage'), validate(createBrandSchema), catalogController.createBrand);
router.put('/brands/:id', ...adminAuth, checkPermission('brands_manage'), validate(brandIdParamSchema, 'params'), validate(updateBrandSchema), catalogController.updateBrand);
router.delete('/brands/:id', ...adminAuth, checkPermission('brands_manage'), validate(brandIdParamSchema, 'params'), catalogController.deleteBrand);

// ─── Vendors ──────────────────────────────────────────────────────────────────
router.post('/vendors', ...adminAuth, checkPermission('vendors_manage'), uploadSingle('document'), validate(registerVendorSchema), vendorController.registerVendor);
router.get('/vendors', ...adminAuth, checkPermission('vendors_manage'), validate(vendorListQuerySchema, 'query'), vendorController.getAllVendors);
router.get('/vendors/pending', ...adminAuth, checkPermission('vendors_manage'), (req, res, next) => { req.query.status = 'pending'; next(); }, validate(vendorListQuerySchema, 'query'), vendorController.getAllVendors);
router.get('/vendors/:id', ...adminAuth, checkPermission('vendors_manage'), validate(vendorIdParamSchema, 'params'), vendorController.getVendorDetail);
router.get('/vendors/:id/commissions', ...adminAuth, checkPermission('vendors_manage'), validate(vendorIdParamSchema, 'params'), validate(vendorCommissionsQuerySchema, 'query'), vendorController.getVendorCommissions);
router.patch('/vendors/:id/status', ...adminAuth, checkPermission('vendors_manage'), validate(vendorIdParamSchema, 'params'), validate(vendorStatusUpdateSchema), vendorController.updateVendorStatus);
router.patch('/vendors/:id/commission', ...adminAuth, checkPermission('vendors_manage'), validate(vendorIdParamSchema, 'params'), validate(vendorCommissionUpdateSchema), vendorController.updateCommissionRate);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', ...adminAuth, checkPermission('customers_manage'), validate(customerListQuerySchema, 'query'), customerController.getAllCustomers);
router.get('/customers/addresses', ...adminAuth, checkPermission('customers_manage'), validate(customerAddressesQuerySchema, 'query'), customerController.getCustomerAddresses);
router.get('/customers/transactions', ...adminAuth, checkPermission('customers_manage'), validate(customerTransactionsQuerySchema, 'query'), customerController.getCustomerTransactions);
router.get('/customers/:id/orders', ...adminAuth, checkPermission('customers_manage'), validate(customerIdParamSchema, 'params'), validate(customerOrdersQuerySchema, 'query'), customerController.getCustomerOrders);
router.get('/customers/:id', ...adminAuth, checkPermission('customers_manage'), validate(customerIdParamSchema, 'params'), customerController.getCustomerById);
router.put('/customers/:id', ...adminAuth, checkPermission('customers_manage'), validate(customerIdParamSchema, 'params'), validate(customerUpdateSchema), customerController.updateCustomerDetail);
router.patch('/customers/:id/status', ...adminAuth, checkPermission('customers_manage'), validate(customerIdParamSchema, 'params'), validate(customerStatusUpdateSchema), customerController.updateCustomerStatus);
router.delete('/customers/:customerId/addresses/:addressId', ...adminAuth, checkPermission('customers_manage'), validate(customerAddressParamsSchema, 'params'), customerController.deleteCustomerAddress);

// ─── Delivery ─────────────────────────────────────────────────────────────────
router.get('/delivery-boys', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryListQuerySchema, 'query'), deliveryController.getAllDeliveryBoys);
router.post('/delivery-boys', ...adminAuth, checkPermission('delivery_manage'), validate(createDeliveryBoySchema), deliveryController.createDeliveryBoy);
router.get('/delivery-boys/:id', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), deliveryController.getDeliveryBoyById);
router.put('/delivery-boys/:id', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), validate(updateDeliveryBoySchema), deliveryController.updateDeliveryBoy);
router.delete('/delivery-boys/:id', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), deliveryController.deleteDeliveryBoy);
router.patch('/delivery-boys/:id/status', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), validate(updateDeliveryStatusSchema), deliveryController.updateDeliveryBoyStatus);
router.patch('/delivery-boys/:id/application-status', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), validate(updateDeliveryApplicationStatusSchema), deliveryController.updateDeliveryBoyApplicationStatus);
router.post('/delivery-boys/:id/settle-cash', ...adminAuth, checkPermission('delivery_manage'), validate(deliveryBoyIdParamSchema, 'params'), validate(settleCashSchema), deliveryController.settleCash);

// ─── Return Requests ──────────────────────────────────────────────────────────
router.get('/return-requests', ...adminAuth, checkPermission('orders_manage'), returnController.getAllReturnRequests);
router.get('/return-requests/:id', ...adminAuth, checkPermission('orders_manage'), returnController.getReturnRequestById);
router.patch('/return-requests/:id/status', ...adminAuth, checkPermission('orders_manage'), returnController.updateReturnRequestStatus);

// ─── Support Tickets ──────────────────────────────────────────────────────────
router.get('/support/tickets', ...adminAuth, checkPermission('support_manage'), supportController.getAllTickets);
router.get('/support/tickets/:id', ...adminAuth, checkPermission('support_manage'), supportController.getTicketById);
router.patch('/support/tickets/:id/status', ...adminAuth, checkPermission('support_manage'), supportController.updateTicketStatus);
router.post('/support/tickets/:id/messages', ...adminAuth, checkPermission('support_manage'), supportController.addTicketMessage);
router.get('/support/ticket-types', ...adminAuth, checkPermission('support_manage'), supportController.getAllTicketTypes);
router.post('/support/ticket-types', ...adminAuth, checkPermission('support_manage'), supportController.createTicketType);
router.put('/support/ticket-types/:id', ...adminAuth, checkPermission('support_manage'), supportController.updateTicketType);
router.delete('/support/ticket-types/:id', ...adminAuth, checkPermission('support_manage'), supportController.deleteTicketType);

// ─── Product Reviews ──────────────────────────────────────────────────────────
router.get('/reviews', ...adminAuth, checkPermission('products_manage'), reviewController.getAllReviews);
router.patch('/reviews/:id/status', ...adminAuth, checkPermission('products_manage'), reviewController.updateReviewStatus);
router.delete('/reviews/:id', ...adminAuth, checkPermission('products_manage'), reviewController.deleteReview);
router.post('/uploads/image', ...adminAuth, uploadController.uploadImage);

// ─── Marketing & Promotions ──────────────────────────────────────────────────
// Coupons
router.get('/marketing/coupons', ...adminAuth, checkPermission('marketing_manage'), marketingController.getAllCoupons);
router.post('/marketing/coupons', ...adminAuth, checkPermission('marketing_manage'), marketingController.createCoupon);
router.put('/marketing/coupons/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.updateCoupon);
router.delete('/marketing/coupons/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.deleteCoupon);

// Banners
router.get('/marketing/banners', ...adminAuth, checkPermission('marketing_manage'), marketingController.getAllBanners);
router.post('/marketing/banners', ...adminAuth, checkPermission('marketing_manage'), marketingController.createBanner);
router.patch('/marketing/banners/reorder', ...adminAuth, checkPermission('marketing_manage'), marketingController.reorderBanners);
router.put('/marketing/banners/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.updateBanner);
router.delete('/marketing/banners/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.deleteBanner);

// Campaigns
router.get('/marketing/campaigns', ...adminAuth, checkPermission('marketing_manage'), validate(campaignListQuerySchema, 'query'), marketingController.getAllCampaigns);
router.post('/marketing/campaigns', ...adminAuth, checkPermission('marketing_manage'), marketingController.createCampaign);
router.put('/marketing/campaigns/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.updateCampaign);
router.delete('/marketing/campaigns/:id', ...adminAuth, checkPermission('marketing_manage'), validate(marketingIdParamSchema, 'params'), marketingController.deleteCampaign);

// ─── Reports ──────────────────────────────────────────────────────────────────
router.get('/reports/sales', ...adminAuth, checkPermission('reports_view'), reportController.getSalesReport);
router.get('/reports/inventory', ...adminAuth, checkPermission('reports_view'), reportController.getInventoryReport);

// ─── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', ...adminAuth, checkPermission('notifications_manage'), notificationController.getAdminNotifications);
router.put('/notifications/:id/read', ...adminAuth, checkPermission('notifications_manage'), notificationController.markAsRead);
router.put('/notifications/read-all', ...adminAuth, checkPermission('notifications_manage'), notificationController.markAllAsRead);

export default router;
