import { Router } from 'express';
import { authenticate, authorizeAdmin } from '../middlewares/auth.middleware';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from '../controllers/coupon.controller';

const router = Router();

router.post('/validate', authenticate, validateCoupon);

router.get('/', authenticate, authorizeAdmin, listCoupons);
router.post('/', authenticate, authorizeAdmin, createCoupon);
router.put('/:id', authenticate, authorizeAdmin, updateCoupon);
router.delete('/:id', authenticate, authorizeAdmin, deleteCoupon);

export default router;
