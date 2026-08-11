import { Router } from 'express';
import { webhook } from '../controllers/payment.controller';

const router = Router();

router.post('/webhook', webhook);

export default router;
