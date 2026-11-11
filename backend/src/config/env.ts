import path from 'path';
import dotenv from 'dotenv';

// Carrega o .env do backend e, como fallback, o da raiz do repositório.
// dotenv não sobrescreve variáveis já definidas (ex.: as injetadas pelo Docker Compose).
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
