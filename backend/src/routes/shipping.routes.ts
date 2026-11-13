import { Router } from 'express';
import { z } from 'zod';
import { calculateShipping } from '../utils/shipping';

const router = Router();

const quoteSchema = z.object({ zipCode: z.string().min(1, 'Informe o CEP') });

/** GET /api/shipping/quote?zipCode=01001000 — cotação de frete por CEP (pública). */
router.get('/quote', (req, res) => {
  const parsed = quoteSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.errors[0].message });
  }
  const quote = calculateShipping(parsed.data.zipCode);
  if (!quote) {
    return res.status(400).json({ success: false, message: 'CEP inválido ou fora da área de entrega' });
  }
  res.json({ success: true, data: quote });
});

export default router;
