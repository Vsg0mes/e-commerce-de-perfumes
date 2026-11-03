import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const webhook = async (req: Request, res: Response) => {
  let event: Stripe.Event;
  try {
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature error:', err);
    return res.status(400).send('Invalid signature');
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded' ||
      event.type === 'checkout.session.async_payment_failed' ||
      event.type === 'checkout.session.expired'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.orderId;
      if (!orderId) return res.status(400).send('No order reference');

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order) return res.status(404).send('Order not found');

      if (order.paymentStatus === 'APPROVED') {
        return res.status(200).send('Already processed');
      }

      const paymentId = (session.payment_intent as string) || session.id;

      if (
        event.type === 'checkout.session.async_payment_succeeded' ||
        (event.type === 'checkout.session.completed' && session.payment_status === 'paid')
      ) {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'APPROVED', status: 'PAID', paymentId },
        });
      } else if (
        event.type === 'checkout.session.async_payment_failed' ||
        event.type === 'checkout.session.expired'
      ) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'REJECTED', paymentId },
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
