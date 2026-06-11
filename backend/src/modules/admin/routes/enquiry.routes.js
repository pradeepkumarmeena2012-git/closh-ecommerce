import { Router } from 'express';
import * as enquiryController from '../controllers/enquiry.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorizeAdmin, enforceAccountStatus } from '../../../middlewares/authorize.js';

const router = Router();
const adminAuth = [authenticate, authorizeAdmin, enforceAccountStatus];

router.get('/', ...adminAuth, enquiryController.getEnquiries);
router.post('/:id/handle', ...adminAuth, enquiryController.handleEnquiry);

export default router;
