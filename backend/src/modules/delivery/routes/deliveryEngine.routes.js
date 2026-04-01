import { Router } from 'express';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize, enforceAccountStatus } from '../../../middlewares/authorize.js';
import {
    getDeliveryFlow,
    assignBatch,
    pickupBatch,
    startBatchDelivery,
    markBatchArrived,
    processTryAndBuy,
    processBatchPayment,
    completeBatchDelivery
} from '../controllers/deliveryEngine.controller.js';

const router = Router();

// Base PATH: /api/delivery/engine

router.use(authenticate, authorize('delivery'), enforceAccountStatus);

// Read batch flow
router.get('/batch/:batchId/flow', getDeliveryFlow);

// Lifecycle endpoints
router.post('/batch/assign', assignBatch); // Combines orders into a new batch for this delivery boy
router.patch('/batch/:batchId/pickup', pickupBatch);
router.patch('/batch/:batchId/start', startBatchDelivery);
router.patch('/batch/:batchId/arrived', markBatchArrived);
router.patch('/batch/:batchId/try-buy', processTryAndBuy);
router.patch('/batch/:batchId/payment', processBatchPayment);
router.patch('/batch/:batchId/complete', completeBatchDelivery);

export default router;
