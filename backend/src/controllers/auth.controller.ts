import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../prisma';
import { generateToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../services/mailer';
import { isValidCpf } from '../utils/cpf';
import { z } from 'zod';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

const hashResetToken = (rawToken: string) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
  cpf: z
    .string()
    .optional()
    .refine((v) => !v || isValidCpf(v), { message: 'CPF inválido' }),
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, phone, cpf } = validatedData;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(cpf ? [{ cpf }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Usuário já cadastrado com este e-mail ou CPF' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        cpf,
      },
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro no cadastro:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
});

const GENERIC_FORGOT_MESSAGE =
  'Se o e-mail informado estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes.';

/**
 * POST /api/auth/forgot-password
 * Responde sempre de forma genérica (evita enumeração de e-mails).
 * Armazena apenas o hash SHA-256 do token com validade de 1 hora.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await sendPasswordResetEmail(user, rawToken);
    }

    return res.json({
      success: true,
      message: GENERIC_FORGOT_MESSAGE,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro em forgot-password:', error);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token de redefinição obrigatório'),
  password: z
    .string()
    .min(6, 'A nova senha deve ter no mínimo 6 caracteres')
    .max(72, 'A nova senha deve ter no máximo 72 caracteres'),
});

/**
 * POST /api/auth/reset-password
 * Valida o hash do token, garante uso único e expiração de 1 hora de forma atômica, e redefine a senha.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(token);
    const now = new Date();

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt !== null || record.expiresAt <= now) {
      return res.status(400).json({
        success: false,
        message: 'Token de redefinição inválido, expirado ou já utilizado',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const didReset = await prisma.$transaction(async (tx) => {
      // Marca como utilizado atomicamente (uso único garantido mesmo em requisições simultâneas)
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (consumed.count !== 1) return false;

      // Invalida eventuais outros tokens pendentes do mesmo usuário
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      });

      return true;
    });

    if (!didReset) {
      return res.status(400).json({
        success: false,
        message: 'Token de redefinição inválido, expirado ou já utilizado',
      });
    }

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Erro em reset-password:', error);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
