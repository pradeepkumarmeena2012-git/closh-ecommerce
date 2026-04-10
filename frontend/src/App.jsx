import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import CartDrawer from "./shared/components/Cart/CartDrawer";
import ProtectedRoute from "./shared/components/Auth/ProtectedRoute";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";
import AdminLogin from "./modules/Admin/pages/Login";
import AdminProtectedRoute from "./modules/Admin/components/AdminProtectedRoute";
import AdminLayout from "./modules/Admin/components/Layout/AdminLayout";
import Attributes from "./modules/Admin/pages/Attributes";
import Dashboard from "./modules/Admin/pages/Dashboard";
import Products from "./modules/Admin/pages/Products";
import ProductForm from "./modules/Admin/pages/ProductForm";
import AdminOrders from "./modules/Admin/pages/Orders";
import OrderDetail from "./modules/Admin/pages/OrderDetail";
import ReturnRequests from "./modules/Admin/pages/ReturnRequests";
import ReturnRequestDetail from "./modules/Admin/pages/ReturnRequestDetail";
import Categories from "./modules/Admin/pages/Categories";
import Brands from "./modules/Admin/pages/Brands";
import Customers from "./modules/Admin/pages/Customers";

import StaffManagement from "./modules/Admin/pages/staff/StaffManagement";
import Campaigns from "./modules/Admin/pages/Campaigns";
import Banners from "./modules/Admin/pages/Banners";
import Reviews from "./modules/Admin/pages/Reviews";
import Analytics from "./modules/Admin/pages/Analytics";
import Content from "./modules/Admin/pages/Content";
import Settings from "./modules/Admin/pages/Settings";
import More from "./modules/Admin/pages/More";
import PromoCodes from "./modules/Admin/pages/PromoCodes";
import ServiceAreas from "./modules/Admin/pages/ServiceAreas";
// Orders child pages
import AllOrders from "./modules/Admin/pages/orders/AllOrders";
import OrderTracking from "./modules/Admin/pages/orders/OrderTracking";

import Invoice from "./modules/Admin/pages/orders/Invoice";
// Products child pages
import ManageProducts from "./modules/Admin/pages/products/ManageProducts";
import PendingProducts from "./modules/Admin/pages/products/PendingProducts";
import TaxPricing from "./modules/Admin/pages/products/TaxPricing";
import ProductRatings from "./modules/Admin/pages/products/ProductRatings";

// Categories child pages
import ManageCategories from "./modules/Admin/pages/categories/ManageCategories";
import CategoryOrder from "./modules/Admin/pages/categories/CategoryOrder";
// Brands child pages
import ManageBrands from "./modules/Admin/pages/brands/ManageBrands";
// Customers child pages
import ViewCustomers from "./modules/Admin/pages/customers/ViewCustomers";
import CustomerAddresses from "./modules/Admin/pages/customers/Addresses";
import Transactions from "./modules/Admin/pages/customers/Transactions";
import CustomerDetailPage from "./modules/Admin/pages/customers/CustomerDetailPage";
// Delivery Management child pages
import DeliveryBoys from "./modules/Admin/pages/delivery/DeliveryBoys";
import CashCollection from "./modules/Admin/pages/delivery/CashCollection";
import AssignDelivery from "./modules/Admin/pages/delivery/AssignDelivery";
import Withdrawals from "./modules/Admin/pages/delivery/Withdrawals";
// Vendors child pages
import Vendors from "./modules/Admin/pages/Vendors";
import ManageVendors from "./modules/Admin/pages/vendors/ManageVendors";
import PendingApprovals from "./modules/Admin/pages/vendors/PendingApprovals";
import RegisterVendor from "./modules/Admin/pages/vendors/RegisterVendor";
import VendorDetail from "./modules/Admin/pages/vendors/VendorDetail";
import CommissionRates from "./modules/Admin/pages/vendors/CommissionRates";
import AdminVendorAnalytics from "./modules/Admin/pages/vendors/VendorAnalytics";
import VendorExplorer from "./modules/Admin/pages/vendors/VendorExplorer";

// Offers & Sliders child pages
import HomeSliders from "./modules/Admin/pages/offers/HomeSliders";
import FestivalOffers from "./modules/Admin/pages/offers/FestivalOffers";
// Notifications child pages
import PushNotifications from "./modules/Admin/pages/notifications/PushNotifications";
import AllNotifications from "./modules/Admin/pages/notifications/AllNotifications";
// Support Desk child pages
import LiveChat from "./modules/Admin/pages/support/LiveChat";
import TicketTypes from "./modules/Admin/pages/support/TicketTypes";
import Tickets from "./modules/Admin/pages/support/Tickets";
// Reports child pages
import SalesReport from "./modules/Admin/pages/reports/SalesReport";
import InventoryReport from "./modules/Admin/pages/reports/InventoryReport";
import EarningsReport from "./modules/Admin/pages/reports/EarningsReport";
// Analytics & Finance child pages
import RevenueOverview from "./modules/Admin/pages/finance/RevenueOverview";
import ProfitLoss from "./modules/Admin/pages/finance/ProfitLoss";
import OrderTrends from "./modules/Admin/pages/finance/OrderTrends";
import PaymentBreakdown from "./modules/Admin/pages/finance/PaymentBreakdown";
import TaxReports from "./modules/Admin/pages/finance/TaxReports";
import RefundReports from "./modules/Admin/pages/finance/RefundReports";
// Consolidated Settings pages
import GeneralSettings from "./modules/Admin/pages/settings/GeneralSettings";
import PaymentShippingSettings from "./modules/Admin/pages/settings/PaymentShippingSettings";
import OrdersCustomersSettings from "./modules/Admin/pages/settings/OrdersCustomersSettings";
import ProductsInventorySettings from "./modules/Admin/pages/settings/ProductsInventorySettings";
import ContentFeaturesSettings from "./modules/Admin/pages/settings/ContentFeaturesSettings";
import NotificationsSEOSettings from "./modules/Admin/pages/settings/NotificationsSEOSettings";
// Policies child pages
import PrivacyPolicy from "./modules/Admin/pages/policies/PrivacyPolicy";
import RefundPolicy from "./modules/Admin/pages/policies/RefundPolicy";
import TermsConditions from "./modules/Admin/pages/policies/TermsConditions";
// Firebase child pages
import PushConfig from "./modules/Admin/pages/firebase/PushConfig";
import Authentication from "./modules/Admin/pages/firebase/Authentication";
import RouteWrapper from "./shared/components/RouteWrapper";
import ScrollToTop from "./shared/components/ScrollToTop";
import AppBootstrap from "./shared/components/AppBootstrap";

// User Module Routes (main customer-facing frontend)
import UserLayout from "./modules/user/components/Layout/UserLayout";
import UserProviders from "./modules/user/components/Layout/UserProviders";
import UserHomePage from "./modules/user/pages/Home/HomePage";
import UserProductDetail from "./modules/user/pages/Product/ProductDetailsPage";
import UserShopPage from "./modules/user/pages/Shop/ShopPage";
import UserProductsPage from "./modules/user/pages/Products/ProductsPage";
import UserCartPage from "./modules/user/pages/Cart/CartPage";
import MobileCategories from "./modules/user/pages/categories";
import UserCheckoutPage from "./modules/user/pages/Checkout/CheckoutPage";
import UserPaymentPage from "./modules/user/pages/Payment/PaymentPage";
import UserLoginPage from "./modules/user/pages/Auth/LoginPage";
import UserRegisterPage from "./modules/user/pages/Auth/RegisterPage";
import UserProfilePage from "./modules/user/pages/Profile/ProfilePage";
import UserAccountPage from "./modules/user/pages/Profile/AccountPage";
import UserLegalPage from "./modules/user/pages/Profile/LegalPage";
import UserSupportPage from "./modules/user/pages/Profile/SupportPage";
import UserOrdersPage from "./modules/user/pages/Orders/OrdersPage";
import UserOrderDetailPage from "./modules/user/pages/Orders/OrderDetailsPage";
import UserOrderSuccessPage from "./modules/user/pages/Orders/OrderSuccessPage";
import UserTrackOrderPage from "./modules/user/pages/Orders/TrackOrderPage";
import UserAddressesPage from "./modules/user/pages/Addresses/AddressesPage";
import UserWishlistPage from "./modules/user/pages/Wishlist/WishlistPage";
import UserOffersPage from "./modules/user/pages/Offers/OffersPage";
import UserEventsPage from "./modules/user/pages/Events/EventsPage";
import UserReferPage from "./modules/user/pages/Refer/ReferPage";
import CampaignSale from "./modules/user/pages/CampaignSale";
// Delivery Routes
import DeliveryLogin from "./modules/Delivery/pages/Login";
import DeliveryRegister from "./modules/Delivery/pages/Register";
import DeliveryForgotPassword from "./modules/Delivery/pages/ForgotPassword";
import DeliveryResetPassword from "./modules/Delivery/pages/ResetPassword";
import DeliveryProtectedRoute from "./modules/Delivery/components/DeliveryProtectedRoute";
import DeliveryLayout from "./modules/Delivery/components/Layout/DeliveryLayout";
import DeliveryDashboard from "./modules/Delivery/pages/Dashboard";
import DeliveryOrders from "./modules/Delivery/pages/Orders";
import DeliveryOrderDetail from "./modules/Delivery/pages/OrderDetail";
import DeliveryProfile from "./modules/Delivery/pages/Profile";
import DeliveryNotifications from "./modules/Delivery/pages/Notifications";
import DeliveryLiveTracking from "./modules/Delivery/pages/LiveTracking";
import DeliveryPayouts from "./modules/Delivery/pages/Payouts";
// Vendor Routes
import VendorLogin from "./modules/Vendor/pages/Login";
import VendorRegister from "./modules/Vendor/pages/Register";
import VendorVerification from "./modules/Vendor/pages/Verification";
import VendorForgotPassword from "./modules/Vendor/pages/ForgotPassword";
import VendorResetPassword from "./modules/Vendor/pages/ResetPassword";
import VendorProtectedRoute from "./modules/Vendor/components/VendorProtectedRoute";
import VendorLayout from "./modules/Vendor/components/Layout/VendorLayout";
import VendorDashboard from "./modules/Vendor/pages/Dashboard";
import VendorProducts from "./modules/Vendor/pages/Products";
import VendorManageProducts from "./modules/Vendor/pages/products/ManageProducts";
import VendorAddProduct from "./modules/Vendor/pages/products/AddProduct";
import VendorProductForm from "./modules/Vendor/pages/products/ProductForm";
import VendorOrders from "./modules/Vendor/pages/Orders";
import VendorAllOrders from "./modules/Vendor/pages/orders/AllOrders";
import VendorOrderTracking from "./modules/Vendor/pages/orders/OrderTracking";
import VendorOrderDetail from "./modules/Vendor/pages/orders/OrderDetail";
import VendorAnalytics from "./modules/Vendor/pages/Analytics";
import VendorEarnings from "./modules/Vendor/pages/Earnings";
import VendorSettings from "./modules/Vendor/pages/Settings";
import VendorStockManagement from "./modules/Vendor/pages/StockManagement";
import VendorWalletHistory from "./modules/Vendor/pages/WalletHistory";
import VendorReturnRequests from "./modules/Vendor/pages/ReturnRequests";
import VendorReturnRequestDetail from "./modules/Vendor/pages/returns/ReturnRequestDetail";
import VendorProductReviews from "./modules/Vendor/pages/ProductReviews";
import VendorHelp from "./modules/Vendor/pages/VendorHelp";
import VendorInventoryReports from "./modules/Vendor/pages/InventoryReports";
import VendorPerformanceMetrics from "./modules/Vendor/pages/PerformanceMetrics";
import VendorDocuments from "./modules/Vendor/pages/Documents";
import VendorNotifications from "./modules/Vendor/pages/Notifications";
import VendorSupportTickets from "./modules/Vendor/pages/SupportTickets";
import VendorPickupLocations from "./modules/Vendor/pages/PickupLocations";
import VendorReports from "./modules/Vendor/pages/Reports";
import VendorLanguageSettings from "./modules/Vendor/pages/LanguageSettings";

// Inner component that has access to useLocation
const AppRoutes = () => {
  return (
    <Routes>
      {/* Admin Routes (Prioritized) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="products/manage-products" element={<ManageProducts />} />
        <Route path="products/pending" element={<PendingProducts />} />
        <Route path="products/tax-pricing" element={<TaxPricing />} />
        <Route path="products/product-ratings" element={<ProductRatings />} />
        <Route path="more" element={<More />} />
        <Route path="categories" element={<Categories />} />
        <Route
          path="categories/manage-categories"
          element={<ManageCategories />}
        />
        <Route path="categories/category-order" element={<CategoryOrder />} />
        <Route path="brands" element={<Brands />} />
        <Route path="brands/manage-brands" element={<ManageBrands />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/invoice" element={<Invoice />} />
        <Route path="orders/all-orders" element={<AllOrders />} />
        <Route path="orders/order-tracking" element={<OrderTracking />} />
        <Route path="return-requests" element={<ReturnRequests />} />
        <Route path="return-requests/:id" element={<ReturnRequestDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/view-customers" element={<ViewCustomers />} />
        <Route path="customers/addresses" element={<CustomerAddresses />} />
        <Route path="customers/transactions" element={<Transactions />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />

        <Route path="delivery" element={<DeliveryBoys />} />
        <Route path="delivery/delivery-boys" element={<DeliveryBoys />} />
        <Route path="delivery/cash-collection" element={<CashCollection />} />
        <Route path="delivery/assign-delivery" element={<AssignDelivery />} />
        <Route path="delivery/withdrawals" element={<Withdrawals />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/manage-vendors" element={<ManageVendors />} />
        <Route
          path="vendors/pending-approvals"
          element={<PendingApprovals />}
        />
        <Route path="vendors/commission-rates" element={<CommissionRates />} />
        <Route
          path="vendors/vendor-analytics"
          element={<AdminVendorAnalytics />}
        />
        <Route path="vendors/explorer" element={<VendorExplorer />} />
        <Route path="vendors/register" element={<RegisterVendor />} />
        <Route path="vendors/:id" element={<VendorDetail />} />

        <Route path="attributes" element={<Attributes />} />
        <Route path="attributes/list" element={<Attributes />} />
        <Route path="attributes/sets" element={<Attributes />} />
        <Route path="attributes/values" element={<Attributes />} />

        <Route path="offers" element={<HomeSliders />} />
        <Route path="offers/home-sliders" element={<HomeSliders />} />
        <Route path="offers/festival-offers" element={<FestivalOffers />} />
        <Route path="promo-codes" element={<PromoCodes />} />
        <Route path="promocodes" element={<PromoCodes />} />

        {/* Support Routes */}
        <Route path="chat-support" element={<LiveChat />} />
        <Route path="support" element={<Navigate to="/admin/customer-support/live-chat" replace />} />
        
        <Route path="customer-support">
          <Route index element={<Navigate to="/admin/customer-support/live-chat" replace />} />
          <Route path="live-chat" element={<LiveChat type="customer" />} />
          <Route path="tickets" element={<Tickets type="customer" />} />
        </Route>

        <Route path="vendor-support">
          <Route index element={<Navigate to="/admin/vendor-support/live-chat" replace />} />
          <Route path="live-chat" element={<LiveChat type="vendor" />} />
          <Route path="tickets" element={<Tickets type="vendor" />} />
        </Route>

        <Route path="notifications" element={<AllNotifications />} />
        <Route
          path="notifications/push-notifications"
          element={<PushNotifications />}
        />
        
        <Route path="reports">
          <Route index element={<Navigate to="/admin/reports/sales-report" replace />} />
          <Route path="sales-report" element={<SalesReport />} />
          <Route path="inventory-report" element={<InventoryReport />} />
          <Route path="earnings-report" element={<EarningsReport />} />
        </Route>
        <Route path="finance" element={<RevenueOverview />} />
        <Route path="finance/revenue-overview" element={<RevenueOverview />} />
        <Route path="finance/profit-loss" element={<ProfitLoss />} />
        <Route path="finance/order-trends" element={<OrderTrends />} />
        <Route
          path="finance/payment-breakdown"
          element={<PaymentBreakdown />}
        />
        <Route path="finance/tax-reports" element={<TaxReports />} />
        <Route path="finance/refund-reports" element={<RefundReports />} />
        <Route path="analytics" element={<Analytics />} />
        <Route
          path="settings"
          element={<Navigate to="/admin/settings/general" replace />}
        />
        <Route path="settings/general" element={<Settings />} />
        <Route path="settings/payment-shipping" element={<Settings />} />
        <Route path="settings/orders-customers" element={<Settings />} />
        <Route path="settings/products-inventory" element={<Settings />} />
        <Route path="settings/content-features" element={<Settings />} />
        <Route path="settings/notifications-seo" element={<Settings />} />
        <Route path="policies" element={<PrivacyPolicy />} />
        <Route path="policies/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="policies/refund-policy" element={<RefundPolicy />} />
        <Route path="policies/terms-conditions" element={<TermsConditions />} />
        <Route path="firebase" element={<PushConfig />} />
        <Route path="firebase/push-config" element={<PushConfig />} />
        <Route path="firebase/authentication" element={<Authentication />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="banners" element={<Banners />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="content" element={<Content />} />
        <Route path="service-areas" element={<ServiceAreas />} />
        {/* Catch-all for unmatched admin routes — stay in admin area */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Delivery Routes */}
      <Route path="/delivery/login" element={<DeliveryLogin />} />
      <Route path="/delivery/register" element={<DeliveryRegister />} />
      <Route path="/delivery/forgot-password" element={<DeliveryForgotPassword />} />
      <Route path="/delivery/reset-password" element={<DeliveryResetPassword />} />
      <Route
        path="/delivery"
        element={
          <DeliveryProtectedRoute>
            <DeliveryLayout />
          </DeliveryProtectedRoute>
        }>
        <Route index element={<Navigate to="/delivery/dashboard" replace />} />
        <Route path="dashboard" element={<DeliveryDashboard />} />
        <Route path="orders" element={<DeliveryOrders />} />
        <Route path="orders/:id" element={<DeliveryOrderDetail />} />
        <Route path="live-tracking/:orderId" element={<DeliveryLiveTracking />} />
        <Route path="notifications" element={<DeliveryNotifications />} />
        <Route path="payouts" element={<DeliveryPayouts />} />
        <Route path="profile" element={<DeliveryProfile />} />
      </Route>

      {/* Vendor Routes */}
      <Route path="/vendor/login" element={<VendorLogin />} />
      <Route path="/vendor/register" element={<VendorRegister />} />
      <Route path="/vendor/verification" element={<VendorVerification />} />
      <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
      <Route path="/vendor/reset-password" element={<VendorResetPassword />} />
      <Route
        path="/vendor"
        element={
          <VendorProtectedRoute>
            <VendorLayout />
          </VendorProtectedRoute>
        }>
        <Route index element={<Navigate to="/vendor/dashboard" replace />} />
        <Route path="dashboard" element={<VendorDashboard />} />
        <Route path="products" element={<VendorProducts />} />
        <Route
          path="products/manage-products"
          element={<VendorManageProducts />}
        />
        <Route path="products/add-product" element={<VendorAddProduct />} />
        <Route path="products/:id" element={<VendorProductForm />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="orders/all-orders" element={<VendorAllOrders />} />
        <Route path="orders/order-tracking" element={<VendorOrderTracking />} />
        <Route path="orders/:id" element={<VendorOrderDetail />} />
        <Route path="analytics" element={<VendorAnalytics />} />
        <Route path="reports" element={<VendorReports />} />
        <Route path="earnings" element={<VendorEarnings />} />
        <Route path="earnings/overview" element={<VendorEarnings />} />
        <Route
          path="earnings/commission-history"
          element={<VendorEarnings />}
        />
        <Route
          path="earnings/settlement-history"
          element={<VendorEarnings />}
        />
        <Route path="stock-management" element={<VendorStockManagement />} />
        <Route path="wallet-history" element={<VendorWalletHistory />} />
        <Route path="help" element={<VendorHelp />} />
        <Route path="notifications" element={<VendorNotifications />} />
        <Route path="return-requests" element={<VendorReturnRequests />} />
        <Route
          path="return-requests/:id"
          element={<VendorReturnRequestDetail />}
        />
        <Route path="product-reviews" element={<VendorProductReviews />} />
        <Route path="pickup-locations" element={<VendorPickupLocations />} />
        <Route path="support-tickets" element={<VendorSupportTickets />} />
        <Route path="inventory-reports" element={<VendorInventoryReports />} />
        <Route
          path="performance-metrics"
          element={<VendorPerformanceMetrics />}
        />
        <Route path="documents" element={<VendorDocuments />} />
        <Route path="language-settings" element={<VendorLanguageSettings />} />
        <Route path="settings" element={<VendorSettings />} />
        <Route path="settings/store" element={<VendorSettings />} />
        <Route path="settings/payment" element={<VendorSettings />} />
        <Route path="settings/payment-settings" element={<VendorSettings />} />
        <Route path="settings/shipping" element={<VendorSettings />} />
        <Route path="settings/shipping-settings" element={<VendorSettings />} />
        <Route path="settings/location" element={<VendorSettings />} />
        <Route path="profile" element={<VendorSettings />} />
      </Route>

      {/* User Module Routes */}
      <Route
        path="/"
        element={
          <RouteWrapper>
            <UserLayout><UserHomePage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/home"
        element={
          <RouteWrapper>
            <UserLayout><UserHomePage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/shop"
        element={<Navigate to="/categories" replace />}
      />
      <Route
        path="/categories"
        element={
          <RouteWrapper>
            <UserLayout><MobileCategories /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/category/:categoryId"
        element={
          <RouteWrapper>
            <UserLayout><MobileCategories /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/products"
        element={
          <RouteWrapper>
            <UserLayout variant="products"><UserProductsPage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/product/:id"
        element={
          <RouteWrapper>
            <UserLayout variant="product"><UserProductDetail /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/cart"
        element={
          <RouteWrapper>
            <UserLayout variant="cart"><UserCartPage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/checkout"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="checkout"><UserCheckoutPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/payment"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="payment"><UserPaymentPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/wishlist"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout showHeader={false}><UserWishlistPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/offers"
        element={
          <RouteWrapper>
            <UserLayout><UserOffersPage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/events"
        element={
          <RouteWrapper>
            <UserLayout><UserEventsPage /></UserLayout>
          </RouteWrapper>
        }
      />
      <Route
        path="/refer"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout><UserReferPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/sale/:slug"
        element={
          <RouteWrapper>
            <UserLayout showCategoryBar={false}><CampaignSale /></UserLayout>
          </RouteWrapper>
        }
      />

      {/* Auth pages - UserProviders only (contexts but no Header/Footer) */}
      <Route
        path="/login"
        element={
          <RouteWrapper>
            <UserLoginPage />
          </RouteWrapper>
        }
      />
      <Route
        path="/register"
        element={
          <RouteWrapper>
            <UserRegisterPage />
          </RouteWrapper>
        }
      />

      {/* Profile & Account */}
      <Route
        path="/profile"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserProfilePage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/account"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserAccountPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/support"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserSupportPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/legal/:pageId"
        element={
          <RouteWrapper>
            <UserLayout><UserLegalPage /></UserLayout>
          </RouteWrapper>
        }
      />

      {/* Orders */}
      <Route
        path="/orders"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserOrdersPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserOrderDetailPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/order-confirmation/:orderId"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout><UserOrderSuccessPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      <Route
        path="/track-order/:orderId"
        element={
          <RouteWrapper>
            <UserLayout><UserTrackOrderPage /></UserLayout>
          </RouteWrapper>
        }
      />

      {/* Addresses */}
      <Route
        path="/addresses"
        element={
          <RouteWrapper>
            <ProtectedRoute>
              <UserLayout variant="account"><UserAddressesPage /></UserLayout>
            </ProtectedRoute>
          </RouteWrapper>
        }
      />
      {/* This block was moved above */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes >
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        <UserProviders>
          <AppBootstrap />
          <ScrollToTop />
          <AppRoutes />
          <CartDrawer />
          <Toaster
            position="top-center"
            containerStyle={{ zIndex: 99999 }}
            toastOptions={{
              duration: 3500,
              style: {
                background: "rgba(18, 18, 18, 0.92)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "24px",
                padding: "12px 24px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
                maxWidth: "420px",
                textAlign: "center",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#22c55e",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </UserProviders>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
