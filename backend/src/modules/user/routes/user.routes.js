import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as addressController from '../controllers/address.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import * as reviewController from '../controllers/review.controller.js';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth } from '../../../middlewares/authenticate.js';
import { authLimiter, otpLimiter } from '../../../middlewares/rateLimiter.js';

const router = Router();

// Auth routes
router.post('/auth/register', authLimiter, authController.register);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/resend-otp', otpLimiter, authController.resendOTP);
router.post('/auth/login', authLimiter, authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, authController.updateProfile);
router.post('/auth/change-password', authenticate, authController.changePassword);

// Address routes (protected)
router.get('/addresses', authenticate, addressController.getAddresses);
router.post('/addresses', authenticate, addressController.addAddress);
router.put('/addresses/:id', authenticate, addressController.updateAddress);
router.delete('/addresses/:id', authenticate, addressController.deleteAddress);
router.patch('/addresses/:id/default', authenticate, addressController.setDefaultAddress);

// Wishlist routes (protected)
router.get('/wishlist', authenticate, wishlistController.getWishlist);
router.post('/wishlist', authenticate, wishlistController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, wishlistController.removeFromWishlist);

// Review routes
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.post('/reviews', authenticate, reviewController.addReview);
router.post('/reviews/:id/helpful', reviewController.voteHelpful);

// Order routes (optionalAuth for guest checkout)
router.post('/orders', optionalAuth, orderController.placeOrder);
router.get('/orders', authenticate, orderController.getUserOrders);
router.get('/orders/:id', authenticate, orderController.getOrderDetail);
router.patch('/orders/:id/cancel', authenticate, orderController.cancelOrder);

export default router;
