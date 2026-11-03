import express, { Router } from 'express';
import { webhook } from '../controllers/payment.controller';

const router = Router();

// Stripe exige o corpo bruto para validar a assinatura
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

export default router;
