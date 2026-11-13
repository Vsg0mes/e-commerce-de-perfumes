import { Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { saveUserAddress } from '../utils/address';
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

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().trim().max(20, 'Telefone muito longo').optional(),
  address: z
    .object({
      zipCode: z.string({ required_error: 'Informe o CEP' }).trim().min(1, 'Informe o CEP'),
      street: z.string({ required_error: 'Informe a rua' }).trim().min(1, 'Informe a rua'),
      number: z.string({ required_error: 'Informe o número' }).trim().min(1, 'Informe o número'),
      complement: z.string().trim().optional(),
      neighborhood: z.string({ required_error: 'Informe o bairro' }).trim().min(1, 'Informe o bairro'),
      city: z.string({ required_error: 'Informe a cidade' }).trim().min(1, 'Informe a cidade'),
      state: z.string({ required_error: 'Informe o estado' }).trim().min(1, 'Informe o estado'),
    })
    .optional(),
});

/** PATCH /api/users/me — atualiza nome, telefone e (opcionalmente) endereço de entrega. */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address } = updateProfileSchema.parse(req.body);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone: phone || null },
    });
    // Reutiliza/cria o endereço; pedidos antigos mantêm o endereço original
    if (address) await saveUserAddress(req.user!.id, address);
    return getMe(req, res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres').max(72, 'A nova senha deve ter no máximo 72 caracteres'),
});

/** PUT /api/users/me/password — troca a senha exigindo a senha atual. */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, password: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Senha atual incorreta' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'A nova senha deve ser diferente da atual' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro ao trocar senha:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
