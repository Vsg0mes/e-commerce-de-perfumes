import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { generateToken } from '../utils/jwt';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
  cpf: z.string().optional(),
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
