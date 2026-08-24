import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();
const port = process.env.PORT || 3333;

// CORS: aceita requisições do frontend via Nginx (FRONTEND_URL)
// Em desenvolvimento local também aceita localhost:5173 como fallback
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'http://localhost:5173', // fallback para dev local sem Docker
  'http://localhost:8080',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (ex: Postman, curl, webhooks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Escuta em 0.0.0.0 para ser acessível a partir de outros containers Docker
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${port}`);
});
