import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import {
  getOrder,
  getMyOrders,
  getAdminOrders,
  exportAdminOrdersCsv,
  updateOrderStatus,
  refundOrder,
} from '../controllers/order.controller';

const router = Router();

// Rotas fixas ANTES de '/:id'
router.get('/mine', authenticate, getMyOrders);
router.get('/admin/export', authenticate, authorizeAdmin, exportAdminOrdersCsv);
router.get('/admin', authenticate, authorizeAdmin, getAdminOrders);

router.get('/:id', authenticate, getOrder);
router.patch('/:id/status', authenticate, authorizeAdmin, updateOrderStatus);
router.post('/:id/refund', authenticate, authorizeAdmin, refundOrder);

export default router;
