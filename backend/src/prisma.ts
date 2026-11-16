import { Prisma, PrismaClient } from '@prisma/client';

// Serializa Decimal(10,2) como number no JSON de resposta da API
// para manter compatibilidade total com o cliente HTTP/frontend.
(Prisma.Decimal.prototype as any).toJSON = function () {
  return Number(this.toFixed(2));
};

const prisma = new PrismaClient();

export default prisma;
