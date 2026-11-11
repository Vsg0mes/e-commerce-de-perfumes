import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { createOrder, getOrder } from '../controllers/order.controller';

const router = Router();

router.post('/', authenticate, createOrder);
router.get('/:id', authenticate, getOrder);

export default router;
