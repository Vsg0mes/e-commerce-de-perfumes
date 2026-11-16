import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import { getAdminStats, getAdminCustomers } from '../controllers/admin.controller';

const router = Router();

router.get('/stats', authenticate, authorizeAdmin, getAdminStats);
router.get('/customers', authenticate, authorizeAdmin, getAdminCustomers);

export default router;
