import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../prisma';
import {
  calculatePixExpiresAfterSeconds,
  createOrderPaymentIntent,
  getConfiguredPaymentMethods,
  stripe,
} from '../services/stripe';
import { calculateShipping } from '../utils/shipping';
import {
  createPaymentIntent,
  handleChargeRefunded,
  handlePaymentFailed,
  handlePaymentSucceeded,
} from '../controllers/payment.controller';
import {
  cancelMyOrder,
  exportAdminOrdersCsv,
  getAdminOrders,
  markOrderReviewed,
  refundOrder,
  resumeOrderPayment,
  updateOrderStatus,
} from '../controllers/order.controller';
import { getAdminStats } from '../controllers/admin.controller';
import { expirePendingOrders } from '../jobs/expirePendingOrders';
import { calculateCouponDiscountCents } from '../controllers/coupon.controller';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
    send(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

describe('Fluxos críticos do E-commerce (Fase 6)', () => {
  let testUserId = '';
  let testAdminId = '';
  let testBrandId = '';
  let testCategoryId = '';
  const createdProductIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdCouponIds: string[] = [];

  const validCustomerInfo = {
    name: 'Cliente Vitest',
    email: 'vitest-customer@memorare.local',
    cpf: '52998224725',
    phone: '11999990000',
    zipCode: '01001000',
    street: 'Praça da Sé',
    number: '100',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
  };

  beforeAll(async () => {
    // Stubs da Stripe para testes determinísticos sem rede externa
    (stripe.paymentIntents as any).create = async (params: any) => ({
      id: `pi_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      client_secret: 'pi_test_secret',
      amount: params.amount,
      status: 'requires_payment_method',
    });
    (stripe.paymentIntents as any).cancel = async (id: string) => ({
      id,
      status: 'canceled',
    });
    (stripe.refunds as any).create = async () => ({
      id: `re_test_${Date.now()}`,
      status: 'succeeded',
    });

    const user = await prisma.user.create({
      data: {
        name: 'Cliente Vitest',
        email: `vitest-${Date.now()}@memorare.local`,
        password: 'hashed_password',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;

    const admin = await prisma.user.create({
      data: {
        name: 'Admin Vitest',
        email: `vitest-admin-${Date.now()}@memorare.local`,
        password: 'hashed_password',
        role: 'ADMIN',
      },
    });
    testAdminId = admin.id;

    const brand = await prisma.brand.create({
      data: { name: `Brand Vitest ${Date.now()}` },
    });
    testBrandId = brand.id;

    const category = await prisma.category.create({
      data: { name: `Cat Vitest ${Date.now()}` },
    });
    testCategoryId = category.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    if (createdCouponIds.length > 0) {
      await prisma.coupon.deleteMany({ where: { id: { in: createdCouponIds } } });
    }
    if (testBrandId) await prisma.brand.delete({ where: { id: testBrandId } });
    if (testCategoryId) await prisma.category.delete({ where: { id: testCategoryId } });
    if (testUserId || testAdminId) {
      await prisma.address.deleteMany({
        where: { userId: { in: [testUserId, testAdminId].filter(Boolean) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUserId, testAdminId].filter(Boolean) } },
      });
    }
    await prisma.$disconnect();
  });

  async function createTestProduct(stock: number, price = 200) {
    const p = await prisma.product.create({
      data: {
        name: `Perfume Vitest ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: 'Descrição de teste',
        price,
        stock,
        brandId: testBrandId,
        categoryId: testCategoryId,
      },
    });
    createdProductIds.push(p.id);
    return p;
  }

  it('1. Cálculo de frete por CEP: regiões, precedência DF/GO e CEPs inválidos', () => {
    expect(calculateShipping('01001-000')).toMatchObject({
      state: 'SP',
      region: 'São Paulo',
      amount: 18,
    });
    expect(calculateShipping('20040020')).toMatchObject({
      state: 'RJ',
      region: 'Sudeste',
      amount: 24,
    });
    expect(calculateShipping('80010000')).toMatchObject({
      state: 'PR',
      region: 'Sul',
      amount: 28,
    });
    // DF (73000-000 a 73699-999) tem precedência sobre a faixa mais ampla de GO
    expect(calculateShipping('73010000')).toMatchObject({
      state: 'DF',
      region: 'Centro-Oeste',
      amount: 32,
    });
    expect(calculateShipping('40020000')).toMatchObject({
      state: 'BA',
      region: 'Nordeste',
      amount: 38,
    });
    expect(calculateShipping('69900000')).toMatchObject({
      state: 'AC',
      region: 'Norte',
      amount: 48,
    });
    expect(calculateShipping('00000000')).toBeNull();
    expect(calculateShipping('12345')).toBeNull();
  });

  it('2. Reserva e devolução atômica de estoque (concorrência no último item, falha e expiração)', async () => {
    const product = await createTestProduct(1, 150);

    const resA = createMockRes();
    const resB = createMockRes();
    const reqPayload = {
      user: { id: testUserId, role: 'CUSTOMER' },
      body: {
        items: [{ productId: product.id, quantity: 1 }],
        customerInfo: validCustomerInfo,
      },
    } as any;

    await Promise.all([
      createPaymentIntent(reqPayload, resA),
      createPaymentIntent(reqPayload, resB),
    ]);

    const statuses = [resA.statusCode, resB.statusCode].sort();
    expect(statuses).toEqual([201, 409]);

    const winnerRes = resA.statusCode === 201 ? resA : resB;
    const loserRes = resA.statusCode === 409 ? resA : resB;
    expect(loserRes.body.message).toContain(product.name);

    const order1Id = winnerRes.body.data.orderId;
    createdOrderIds.push(order1Id);

    const afterReserve = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterReserve.stock).toBe(0);

    // Falha de pagamento devolve o estoque uma única vez mesmo se o evento vier duplicado
    const failEvent: any = {
      id: 'pi_fail_vitest',
      metadata: { orderId: order1Id },
      amount_received: 16800,
      currency: 'brl',
    };
    await handlePaymentFailed(failEvent);
    await handlePaymentFailed(failEvent);

    const afterFail = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterFail.stock).toBe(1);

    // Nova reserva seguida de expiração após 30 min devolve o estoque uma única vez
    const resC = createMockRes();
    await createPaymentIntent(reqPayload, resC);
    expect(resC.statusCode).toBe(201);
    const order2Id = resC.body.data.orderId;
    createdOrderIds.push(order2Id);

    await prisma.order.update({
      where: { id: order2Id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expCount1 = await expirePendingOrders(new Date());
    const expCount2 = await expirePendingOrders(new Date());
    expect(expCount1).toBeGreaterThanOrEqual(1);
    expect(expCount2).toBe(0);

    const afterExpire = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(afterExpire.stock).toBe(1);
  });

  it('3. Webhook payment_intent.succeeded idempotente e proteção para pedido já expirado', async () => {
    const product = await createTestProduct(2, 100);
    const res = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      res
    );
    const orderId = res.body.data.orderId;
    createdOrderIds.push(orderId);

    const piEvent: any = {
      id: 'pi_ok_vitest',
      metadata: { orderId },
      amount_received: 11800, // 100 + 18 frete SP
      currency: 'brl',
    };

    await handlePaymentSucceeded(piEvent);
    await handlePaymentSucceeded(piEvent); // entrega duplicada

    const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const prodAfterPaid = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(paidOrder.status).toBe('PAID');
    expect(paidOrder.paymentStatus).toBe('APPROVED');
    expect(prodAfterPaid.stock).toBe(1); // abatido apenas na reserva inicial

    // Pagamento tardio em pedido expirado -> preserva pagamento e marca needsManualReview sem abater estoque
    const resLate = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resLate
    );
    const lateOrderId = resLate.body.data.orderId;
    createdOrderIds.push(lateOrderId);

    await prisma.order.update({
      where: { id: lateOrderId },
      data: { expiresAt: new Date(Date.now() - 10_000) },
    });
    await expirePendingOrders(new Date());

    const stockBeforeLateWebhook = (
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock;

    await handlePaymentSucceeded({
      id: 'pi_late_vitest',
      metadata: { orderId: lateOrderId },
      amount_received: 11800,
      currency: 'brl',
    } as any);

    const lateOrder = await prisma.order.findUniqueOrThrow({ where: { id: lateOrderId } });
    const stockAfterLateWebhook = (
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock;

    expect(lateOrder.paymentStatus).toBe('APPROVED');
    expect(lateOrder.needsManualReview).toBe(true);
    expect(stockAfterLateWebhook).toBe(stockBeforeLateWebhook);
  });

  it('4. Reembolso idempotente (duplo clique + webhook charge.refunded) e bloqueio em SHIPPED', async () => {
    const product = await createTestProduct(5, 200);
    const resCreate = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 2 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resCreate
    );
    const orderId = resCreate.body.data.orderId;
    createdOrderIds.push(orderId);

    await handlePaymentSucceeded({
      id: 'pi_refund_vitest',
      metadata: { orderId },
      amount_received: 41800,
      currency: 'brl',
    } as any);

    // Duas chamadas simultâneas a refundOrder + webhook charge.refunded total concorrente
    const r1 = createMockRes();
    const r2 = createMockRes();
    await Promise.all([
      refundOrder({ params: { id: orderId }, user: { id: testAdminId, role: 'ADMIN' } } as any, r1),
      refundOrder({ params: { id: orderId }, user: { id: testAdminId, role: 'ADMIN' } } as any, r2),
      handleChargeRefunded({
        id: 'ch_full_vitest',
        payment_intent: 'pi_refund_vitest',
        metadata: { orderId },
        refunded: true,
        amount: 41800,
        amount_refunded: 41800,
      } as any),
    ]);

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);

    const refundedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const prodAfterRefund = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refundedOrder.status).toBe('CANCELLED');
    expect(refundedOrder.paymentStatus).toBe('REFUNDED');
    expect(prodAfterRefund.stock).toBe(5); // devolvido exatamente 1x

    // Reembolso PARCIAL via webhook charge.refunded: não cancela, não devolve estoque e marca needsManualReview
    const resPartialOrder = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resPartialOrder
    );
    const partialOrderId = resPartialOrder.body.data.orderId;
    createdOrderIds.push(partialOrderId);

    await handlePaymentSucceeded({
      id: 'pi_partial_refund_vitest',
      metadata: { orderId: partialOrderId },
      amount_received: 21800,
      currency: 'brl',
    } as any);

    await handleChargeRefunded({
      id: 'ch_partial_vitest',
      payment_intent: 'pi_partial_refund_vitest',
      metadata: { orderId: partialOrderId },
      refunded: false,
      amount: 21800,
      amount_refunded: 5000,
    } as any);

    const partialOrder = await prisma.order.findUniqueOrThrow({ where: { id: partialOrderId } });
    const prodAfterPartial = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(partialOrder.status).toBe('PAID');
    expect(partialOrder.paymentStatus).toBe('APPROVED');
    expect(partialOrder.needsManualReview).toBe(true);
    expect(prodAfterPartial.stock).toBe(4); // estoque permanece reservado/baixado
  });

  it('5. Aplicação de cupom no servidor, limite de uso atômico e devolução ao cancelar', async () => {
    // Desconto não pode deixar subtotal negativo e o frete segue separado
    expect(calculateCouponDiscountCents(10000, 'FIXED', 150)).toBe(10000);
    expect(calculateCouponDiscountCents(20000, 'PERCENTAGE', 15)).toBe(3000);

    const coupon = await prisma.coupon.create({
      data: {
        code: `CUPOM${Date.now()}`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        startDate: new Date(Date.now() - 60_000),
        expirationDate: new Date(Date.now() + 3600_000),
        usageLimit: 1,
        isActive: true,
      },
    });
    createdCouponIds.push(coupon.id);

    const product = await createTestProduct(5, 200);

    // 1º pedido consome o único uso do cupom (subtotal 200, desconto 10% = 20, frete SP = 18 -> total 198)
    const res1 = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          couponCode: coupon.code,
          customerInfo: validCustomerInfo,
        },
      } as any,
      res1
    );
    expect(res1.statusCode).toBe(201);
    expect(res1.body.data.amount).toBe(198);
    expect(res1.body.data.discountAmount).toBe(20);
    const order1Id = res1.body.data.orderId;
    createdOrderIds.push(order1Id);

    // 2º pedido tentando usar o mesmo cupom com usageLimit=1 é bloqueado
    const res2 = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          couponCode: coupon.code,
          customerInfo: validCustomerInfo,
        },
      } as any,
      res2
    );
    expect(res2.statusCode).toBe(400);

    // Cancelar o 1º pedido devolve o uso do cupom (usedCount volta para 0)
    const resCancel = createMockRes();
    await cancelMyOrder(
      { params: { id: order1Id }, user: { id: testUserId, role: 'CUSTOMER' } } as any,
      resCancel
    );
    expect(resCancel.statusCode).toBe(200);

    const couponAfterCancel = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(couponAfterCancel.usedCount).toBe(0);
  });

  it('6. Transições de status do pedido (PAID -> PROCESSING -> SHIPPED -> DELIVERED e bloqueios)', async () => {
    const product = await createTestProduct(3, 100);
    const resCreate = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resCreate
    );
    const orderId = resCreate.body.data.orderId;
    createdOrderIds.push(orderId);

    // Admin não pode definir PAID manualmente
    const resManualPaid = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'PAID' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resManualPaid
    );
    expect(resManualPaid.statusCode).toBe(409);

    // Webhook aprova -> PAID
    await handlePaymentSucceeded({
      id: 'pi_flow_vitest',
      metadata: { orderId },
      amount_received: 11800,
      currency: 'brl',
    } as any);

    // PAID -> PROCESSING
    const resProc = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'PROCESSING' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resProc
    );
    expect(resProc.statusCode).toBe(200);

    // PROCESSING -> SHIPPED sem código de rastreio -> 400
    const resShipNoCode = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'SHIPPED' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resShipNoCode
    );
    expect(resShipNoCode.statusCode).toBe(400);

    // PROCESSING -> SHIPPED com código de rastreio -> 200
    const resShipOk = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'SHIPPED', trackingCode: 'BR123456789BR' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resShipOk
    );
    expect(resShipOk.statusCode).toBe(200);
    expect(resShipOk.body.data.trackingCode).toBe('BR123456789BR');

    // SHIPPED -> DELIVERED -> 200
    const resDeliv = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'DELIVERED' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resDeliv
    );
    expect(resDeliv.statusCode).toBe(200);

    // Estado final DELIVERED não permite voltar para PROCESSING -> 409
    const resFromFinal = createMockRes();
    await updateOrderStatus(
      {
        params: { id: orderId },
        body: { status: 'PROCESSING' },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resFromFinal
    );
    expect(resFromFinal.statusCode).toBe(409);
  });

  it('7. Filtro needsManualReview, manualReviewCount em stats, coluna no CSV e PATCH /api/orders/:id/review', async () => {
    const product = await createTestProduct(5, 120);
    const resCreate = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resCreate
    );
    const orderId = resCreate.body.data.orderId;
    createdOrderIds.push(orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: { needsManualReview: true },
    });

    // GET /api/orders/admin?needsManualReview=true
    const resList = createMockRes();
    await getAdminOrders(
      {
        query: { needsManualReview: 'true', q: orderId },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resList
    );
    expect(resList.statusCode).toBe(200);
    expect(resList.body.data.some((o: any) => o.id === orderId && o.needsManualReview === true)).toBe(true);

    // GET /api/admin/stats inclui manualReviewCount >= 1
    const resStats = createMockRes();
    await getAdminStats(
      {
        query: {},
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resStats
    );
    expect(resStats.statusCode).toBe(200);
    expect(resStats.body.data.manualReviewCount).toBeGreaterThanOrEqual(1);

    // GET /api/orders/admin/export?needsManualReview=true inclui coluna "Revisão manual" com "Sim"
    const resCsv = createMockRes();
    await exportAdminOrdersCsv(
      {
        query: { needsManualReview: 'true', q: orderId },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resCsv
    );
    expect(resCsv.statusCode).toBe(200);
    expect(String(resCsv.body)).toContain('Revisão manual');
    expect(String(resCsv.body)).toContain(';Sim;');

    // PATCH /api/orders/:id/review limpa needsManualReview de forma idempotente
    const resReview1 = createMockRes();
    await markOrderReviewed(
      {
        params: { id: orderId },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resReview1
    );
    expect(resReview1.statusCode).toBe(200);
    expect(resReview1.body.data.needsManualReview).toBe(false);

    const resReview2 = createMockRes();
    await markOrderReviewed(
      {
        params: { id: orderId },
        user: { id: testAdminId, role: 'ADMIN' },
      } as any,
      resReview2
    );
    expect(resReview2.statusCode).toBe(200);
    expect(resReview2.body.data.needsManualReview).toBe(false);
  });

  it('8. Pix e Cartão: payment_method_types explícito, expires_after_seconds sincronizado, resumeOrderPayment e job expirePendingOrders seguro', async () => {
    // 8.1 Configuração de métodos de pagamento e cálculo de expires_after_seconds
    expect(getConfiguredPaymentMethods('card,pix')).toEqual(['card', 'pix']);
    expect(getConfiguredPaymentMethods('card')).toEqual(['card']);
    expect(getConfiguredPaymentMethods('pix,boleto,invalid')).toEqual(['pix']);

    const baseNow = new Date('2026-11-19T12:00:00Z');
    const in60Min = new Date(baseNow.getTime() + 60 * 60 * 1000);
    expect(calculatePixExpiresAfterSeconds(in60Min, baseNow)).toBe(3600);
    // Clamping no limite mínimo (60s) e máximo (14 dias = 1209600s) da Stripe
    expect(calculatePixExpiresAfterSeconds(new Date(baseNow.getTime() + 10_000), baseNow)).toBe(60);
    expect(
      calculatePixExpiresAfterSeconds(new Date(baseNow.getTime() + 30 * 24 * 3600_000), baseNow)
    ).toBe(1209600);

    // Captura parâmetros enviados para stripe.paymentIntents.create
    const createdParams: any[] = [];
    const origCreate = (stripe.paymentIntents as any).create;
    (stripe.paymentIntents as any).create = async (params: any) => {
      createdParams.push(params);
      return {
        id: `pi_pix_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        client_secret: 'pi_pix_secret',
        amount: params.amount,
        status: 'requires_action',
      };
    };

    const prevMethods = process.env.STRIPE_PAYMENT_METHODS;
    process.env.STRIPE_PAYMENT_METHODS = 'card,pix';
    await createOrderPaymentIntent({
      orderId: 'order_pix_1',
      amountCents: 15000,
      email: 'pix@memorare.local',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      idempotencyKey: 'idem_pix_1',
    });
    expect(createdParams[0].payment_method_types).toEqual(['card', 'pix']);
    expect(createdParams[0].automatic_payment_methods).toBeUndefined();
    expect(createdParams[0].payment_method_options?.pix?.expires_after_seconds).toBeGreaterThanOrEqual(3590);
    expect(createdParams[0].payment_method_options?.pix?.expires_after_seconds).toBeLessThanOrEqual(3600);

    process.env.STRIPE_PAYMENT_METHODS = 'card';
    await createOrderPaymentIntent({
      orderId: 'order_card_only',
      amountCents: 15000,
      email: 'card@memorare.local',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      idempotencyKey: 'idem_card_1',
    });
    expect(createdParams[1].payment_method_types).toEqual(['card']);
    expect(createdParams[1].payment_method_options).toBeUndefined();
    process.env.STRIPE_PAYMENT_METHODS = prevMethods;

    // 8.2 resumeOrderPayment reutiliza PaymentIntent em requires_action e cria novo quando canceled
    const product = await createTestProduct(5, 100);
    const resCreate = createMockRes();
    await createPaymentIntent(
      {
        user: { id: testUserId, role: 'CUSTOMER' },
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          customerInfo: validCustomerInfo,
        },
      } as any,
      resCreate
    );
    const orderId = resCreate.body.data.orderId;
    createdOrderIds.push(orderId);
    const initialOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const firstPiId = initialOrder.paymentId!;

    const origRetrieve = (stripe.paymentIntents as any).retrieve;
    (stripe.paymentIntents as any).retrieve = async (id: string) => ({
      id,
      status: 'requires_action',
      client_secret: 'existing_pix_qr_secret',
    });

    const countBeforeReuse = createdParams.length;
    const resResumeReuse = createMockRes();
    await resumeOrderPayment(
      { params: { id: orderId }, user: { id: testUserId, role: 'CUSTOMER' } } as any,
      resResumeReuse
    );
    expect(resResumeReuse.statusCode).toBe(200);
    expect(resResumeReuse.body.data.clientSecret).toBe('existing_pix_qr_secret');
    expect(createdParams.length).toBe(countBeforeReuse); // reutilizou sem criar novo

    // Quando o PI anterior está canceled, resumeOrderPayment cria um novo com createOrderPaymentIntent
    (stripe.paymentIntents as any).retrieve = async (id: string) => ({
      id,
      status: 'canceled',
      client_secret: 'old_canceled_secret',
    });
    const resResumeNew = createMockRes();
    await resumeOrderPayment(
      { params: { id: orderId }, user: { id: testUserId, role: 'CUSTOMER' } } as any,
      resResumeNew
    );
    expect(resResumeNew.statusCode).toBe(200);
    expect(resResumeNew.body.data.clientSecret).toBe('pi_pix_secret');
    expect(createdParams.length).toBe(countBeforeReuse + 1);
    const afterResumeOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(afterResumeOrder.paymentId).not.toBe(firstPiId);

    // 8.3 expirePendingOrders NÃO expira nem devolve estoque se o cancelamento na Stripe falhar (ex.: PI em processing)
    await prisma.order.update({
      where: { id: orderId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const origCancel = (stripe.paymentIntents as any).cancel;
    (stripe.paymentIntents as any).retrieve = async (id: string) => ({
      id,
      status: 'requires_action',
    });
    (stripe.paymentIntents as any).cancel = async () => {
      throw new Error('Falha temporária ou PaymentIntent em processamento na Stripe');
    };

    const stockBeforeFailedExpire = (
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock;
    await expirePendingOrders(new Date());

    const orderStillPending = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const stockAfterFailedExpire = (
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock;
    expect(orderStillPending.status).toBe('PENDING');
    expect(stockAfterFailedExpire).toBe(stockBeforeFailedExpire);

    // Quando a Stripe confirma o cancelamento do PaymentIntent (status 'canceled'), o job expira e devolve o estoque 1x
    (stripe.paymentIntents as any).cancel = async (id: string) => ({
      id,
      status: 'canceled',
    });
    await expirePendingOrders(new Date());

    const orderNowCancelled = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const stockAfterConfirmedCancel = (
      await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    ).stock;
    expect(orderNowCancelled.status).toBe('CANCELLED');
    expect(orderNowCancelled.paymentStatus).toBe('CANCELLED');
    expect(stockAfterConfirmedCancel).toBe(stockBeforeFailedExpire + 1);

    // Restaura stubs originais
    (stripe.paymentIntents as any).create = origCreate;
    (stripe.paymentIntents as any).retrieve = origRetrieve;
    (stripe.paymentIntents as any).cancel = origCancel;
  });
});
