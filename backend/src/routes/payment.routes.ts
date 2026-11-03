import express, { Router } from 'express';
import { createPaymentIntent, webhook } from '../controllers/payment.controller';

const router = Router();

router.post('/create-payment-intent', createPaymentIntent);

// Stripe exige o corpo bruto para validar a assinatura (não passar por express.json)
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

export default router;
