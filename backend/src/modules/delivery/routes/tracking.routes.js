import express from 'express';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import * as trackingController from '../controllers/tracking.controller.js';

const router = express.Router();

// All routes require delivery boy authentication
router.use(authenticate, authorize('delivery'));

/**
 * @route   POST /api/delivery/tracking/update-location
 * @desc    Update location with distance tracking
 * @access  Private
 */
router.post('/update-location', trackingController.updateLocationWithTracking);

/**
 * @route   GET /api/delivery/tracking/stats/:orderId
 * @desc    Get tracking stats for specific order
 * @access  Private
 */
router.get('/stats/:orderId', trackingController.getTrackingStats);

/**
 * @route   GET /api/delivery/tracking/my-stats
 * @desc    Get delivery boy's overall tracking stats
 * @access  Private
 */
router.get('/my-stats', trackingController.getMyTrackingStats);

export default router;
