import '../config/env';
import jwt from 'jsonwebtoken';

const WEAK_SECRETS = ['supersecret', 'super_secret_jwt_key_here', 'changeme'];
const MIN_PRODUCTION_LENGTH = 32;

const loadJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET não definido. Gere um com: openssl rand -hex 32');
  }
  if (WEAK_SECRETS.includes(secret.toLowerCase()) || secret.toUpperCase().startsWith('TROQUE')) {
    throw new Error('JWT_SECRET usa um valor fraco/conhecido. Gere um novo com: openssl rand -hex 32');
  }
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_PRODUCTION_LENGTH) {
    throw new Error(`JWT_SECRET deve ter no mínimo ${MIN_PRODUCTION_LENGTH} caracteres em produção.`);
  }
  return secret;
};

// Falha na inicialização (import) se o segredo for inválido.
const JWT_SECRET = loadJwtSecret();

export const generateToken = (userId: string, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
