import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import {
  createOrder,
  getOrder,
  getMyOrders,
  getAdminOrders,
  updateOrderStatus,
} from '../controllers/order.controller';

const router = Router();

router.post('/', authenticate, createOrder);

// Rotas fixas ANTES de '/:id'
router.get('/mine', authenticate, getMyOrders);
router.get('/admin', authenticate, authorizeAdmin, getAdminOrders);

router.get('/:id', authenticate, getOrder);
router.patch('/:id/status', authenticate, authorizeAdmin, updateOrderStatus);

export default router;
