import { Router } from 'express';
import * as cancellationReasonController from '../controllers/cancellationReason.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorizeAdmin, enforceAccountStatus } from '../../../middlewares/authorize.js';

const router = Router();
const adminAuth = [authenticate, authorizeAdmin, enforceAccountStatus];

router.get('/', ...adminAuth, cancellationReasonController.getReasons);
router.post('/', ...adminAuth, cancellationReasonController.createReason);
router.put('/:id', ...adminAuth, cancellationReasonController.updateReason);
router.delete('/:id', ...adminAuth, cancellationReasonController.deleteReason);

export default router;
