import { Request, Response } from 'express';
import { Coupon, DiscountType } from '@prisma/client';
import { z } from 'zod';
import prisma from '../prisma';

const toCents = (v: unknown) => Math.round(Number(v) * 100);

/**
 * Calcula o desconto em centavos a partir do subtotal dos itens (frete é separado).
 * O desconto nunca deixa o subtotal dos itens abaixo de zero.
 */
export function calculateCouponDiscountCents(
  subtotalCents: number,
  discountType: DiscountType,
  discountValue: unknown
): number {
  if (subtotalCents <= 0) return 0;
  const valNum = Number(discountValue);
  if (valNum <= 0) return 0;

  let rawDiscountCents = 0;
  if (discountType === 'PERCENTAGE') {
    const pctBasisPoints = Math.round(valNum * 100); // ex.: 15.5% -> 1550
    rawDiscountCents = Math.round((subtotalCents * pctBasisPoints) / 10000);
  } else {
    rawDiscountCents = toCents(valNum);
  }

  return Math.max(0, Math.min(rawDiscountCents, subtotalCents));
}

/**
 * Verifica se o cupom existe, está ativo, dentro da validade, com usos disponíveis
 * e (quando subtotalCents é informado) se atinge o valor mínimo de pedido (minOrderAmount) ANTES do desconto.
 * Retorna uma mensagem de erro em português se inválido, ou `null` se válido.
 */
export function getCouponValidationError(
  coupon: Coupon | null,
  now: Date = new Date(),
  subtotalCents?: number
): string | null {
  if (!coupon || !coupon.isActive) {
    return 'Cupom inválido ou inativo';
  }
  if (now < coupon.startDate) {
    return 'Este cupom ainda não entrou em vigor';
  }
  if (now > coupon.expirationDate) {
    return 'Este cupom está expirado';
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return 'Este cupom atingiu o limite máximo de usos';
  }
  if (
    subtotalCents !== undefined &&
    coupon.minOrderAmount !== null &&
    coupon.minOrderAmount !== undefined
  ) {
    const minCents = toCents(coupon.minOrderAmount);
    if (minCents > 0 && subtotalCents < minCents) {
      const formattedMin = (minCents / 100).toFixed(2).replace('.', ',');
      return `Pedido mínimo de R$ ${formattedMin} para este cupom`;
    }
  }
  return null;
}

const couponBodySchema = z
  .object({
    code: z
      .string({ required_error: 'Informe o código do cupom' })
      .trim()
      .min(2, 'Código deve ter no mínimo 2 caracteres')
      .max(40, 'Código muito longo')
      .transform((s) => s.toUpperCase()),
    discountType: z.enum(['PERCENTAGE', 'FIXED'], {
      required_error: 'Informe o tipo de desconto',
    }),
    discountValue: z.coerce
      .number({ required_error: 'Informe o valor do desconto' })
      .positive('O valor do desconto deve ser maior que zero'),
    minOrderAmount: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().min(0, 'O valor mínimo do pedido não pode ser negativo').nullable().optional()
    ),
    startDate: z.coerce.date({ required_error: 'Informe a data inicial' }),
    expirationDate: z.coerce.date({ required_error: 'Informe a data de expiração' }),
    usageLimit: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(1, 'Limite de uso deve ser no mínimo 1').nullable().optional()
    ),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || d.discountValue <= 100, {
    message: 'Desconto percentual não pode ser maior que 100%',
    path: ['discountValue'],
  })
  .refine((d) => d.expirationDate > d.startDate, {
    message: 'A data de expiração deve ser posterior à data inicial',
    path: ['expirationDate'],
  });

/** GET /api/coupons — lista todos os cupons (ADMIN). */
export const listCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error listing coupons:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

/** POST /api/coupons — cria novo cupom (ADMIN). */
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const data = couponBodySchema.parse(req.body);

    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Já existe um cupom com este código' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: toCents(data.discountValue) / 100,
        minOrderAmount:
          data.minOrderAmount !== null && data.minOrderAmount !== undefined
            ? toCents(data.minOrderAmount) / 100
            : null,
        startDate: data.startDate,
        expirationDate: data.expirationDate,
        usageLimit: data.usageLimit ?? null,
        isActive: data.isActive,
      },
      include: { _count: { select: { orders: true } } },
    });

    res.status(201).json({ success: true, message: 'Cupom criado com sucesso', data: coupon });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

/** PUT /api/coupons/:id — atualiza um cupom (ADMIN). */
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = couponBodySchema.parse(req.body);

    const current = await prisma.coupon.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado' });
    }

    const duplicate = await prisma.coupon.findFirst({
      where: { code: data.code, id: { not: id } },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Já existe outro cupom com este código' });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: toCents(data.discountValue) / 100,
        minOrderAmount:
          data.minOrderAmount !== null && data.minOrderAmount !== undefined
            ? toCents(data.minOrderAmount) / 100
            : null,
        startDate: data.startDate,
        expirationDate: data.expirationDate,
        usageLimit: data.usageLimit ?? null,
        isActive: data.isActive,
      },
      include: { _count: { select: { orders: true } } },
    });

    res.json({ success: true, message: 'Cupom atualizado com sucesso', data: coupon });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating coupon:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

/** DELETE /api/coupons/:id — exclui um cupom caso não tenha pedidos vinculados (ADMIN). */
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cupom não encontrado' });
    }

    if (existing._count.orders > 0) {
      return res.status(409).json({
        success: false,
        message: `Não é possível excluir o cupom "${existing.code}" pois ele está vinculado a ${existing._count.orders} pedido(s). Desative-o caso não queira mais permitir seu uso.`,
      });
    }

    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true, message: 'Cupom excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const validateCouponSchema = z.object({
  code: z.string({ required_error: 'Informe o código do cupom' }).trim().min(1, 'Informe o código do cupom'),
  subtotal: z.coerce.number().min(0).optional().default(0),
});

/**
 * POST /api/coupons/validate
 * Valida um cupom para pré-visualização no Checkout e retorna o desconto calculado no servidor.
 */
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = validateCouponSchema.parse(req.body);
    const normalizedCode = code.toUpperCase();
    const subtotalCents = toCents(subtotal);

    const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    const validationErr = getCouponValidationError(coupon, new Date(), subtotalCents);
    if (validationErr || !coupon) {
      return res.status(400).json({ success: false, message: validationErr || 'Cupom inválido' });
    }

    const discountCents = calculateCouponDiscountCents(
      subtotalCents,
      coupon.discountType,
      coupon.discountValue
    );

    res.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderAmount: coupon.minOrderAmount !== null ? Number(coupon.minOrderAmount) : null,
        discountAmount: discountCents / 100,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
