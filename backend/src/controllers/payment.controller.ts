import { Request, Response } from 'express';
import prisma from '../prisma';
import { Payment } from 'mercadopago';
import { MercadoPagoConfig } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.PAYMENT_ACCESS_TOKEN || 'TEST-token' });
const payment = new Payment(client);

export const webhook = async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentInfo = await payment.get({ id: data.id });
      
      const orderId = paymentInfo.external_reference;
      const status = paymentInfo.status; // approved, pending, rejected, etc

      if (!orderId) {
        return res.status(400).send('No external_reference');
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        return res.status(404).send('Order not found');
      }

      // Evitar processar novamente se já estiver pago
      if (order.paymentStatus === 'APPROVED' && status === 'approved') {
        return res.status(200).send('Already processed');
      }

      let newPaymentStatus: any = 'PENDING';
      let newOrderStatus: any = order.status;

      if (status === 'approved') {
        newPaymentStatus = 'APPROVED';
        newOrderStatus = 'PAID';

        // Atualizar Estoque
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity }
            }
          });
        }
      } else if (status === 'rejected') {
        newPaymentStatus = 'REJECTED';
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: newOrderStatus,
          paymentId: data.id.toString(),
        }
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
