import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

/** GET /api/users/me — dados de contato e endereço de entrega salvo (o mais recente). */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, cpf: true, phone: true,
        addresses: { orderBy: { updatedAt: 'desc' }, take: 1 },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    const { addresses, ...profile } = user;
    res.json({ success: true, data: { ...profile, address: addresses[0] || null } });
  } catch {
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
