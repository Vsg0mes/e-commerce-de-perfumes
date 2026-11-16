# E-commerce de Perfumes — Memorare

Este projeto implementa um e-commerce completo de alta perfumaria com reserva atômica de estoque, pagamentos e reembolsos via Stripe (`PaymentIntent` + Webhooks), cupons de desconto, e-mails transacionais, recuperação de senha e painel administrativo completo.

## Tecnologias Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand (com persistência), React Router DOM, Stripe Payment Element.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM (`Decimal(10,2)` para valores monetários), bcrypt, jsonwebtoken, Nodemailer, Helmet, Zod, Vitest.
- **Banco de Dados:** PostgreSQL 15.
- **Infraestrutura:** Docker, Docker Compose, Nginx e GitHub Actions (CI).

## Arquitetura

O sistema é orquestrado pelo Docker Compose com proxy reverso Nginx (porta `8080`):
1. `backend/`: API REST Node.js (porta interna `3333`).
2. `frontend/`: Aplicação React/Vite (porta interna `5173`).
3. `postgres`: Banco de dados PostgreSQL (porta interna `5432`).
4. `nginx`: Proxy reverso expondo `http://localhost:8080` (`/api` → backend, `/` → frontend).
5. `stripe-cli` *(profile `stripe`)*: Encaminha eventos da Stripe para o webhook do backend.

## Como configurar o `.env`

Copie o arquivo de exemplo e preencha todas as variáveis obrigatórias:
```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais do PostgreSQL (use a mesma senha em `DATABASE_URL`) |
| `DATABASE_URL` | URL de conexão do Prisma com o PostgreSQL |
| `JWT_SECRET` | Segredo dos tokens JWT. Gere com `openssl rand -hex 32` (mín. 32 caracteres em produção; valores fracos são rejeitados na inicialização) |
| `STRIPE_SECRET_KEY` | Chave secreta da Stripe (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook da Stripe (`whsec_...`) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública da Stripe (`pk_test_...`) para o frontend |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciais do admin inicial criado pelo seed (em dev, sem `ADMIN_PASSWORD`, uma senha aleatória é gerada e impressa uma única vez) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Configuração opcional de SMTP para envio de e-mails transacionais e redefinição de senha. Em desenvolvimento, sem `SMTP_HOST`, os e-mails são registrados no console |
| `FRONTEND_URL`, `BACKEND_URL` | URL pública da aplicação (padrão `http://localhost:8080`) |

## Como executar (Docker)

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Acesse a aplicação em **[http://localhost:8080](http://localhost:8080)**.

## Como usar o Stripe CLI (Webhooks em Desenvolvimento)

Você pode escutar e encaminhar os eventos `payment_intent.succeeded`, `payment_intent.payment_failed` e `charge.refunded` de duas formas:

1. **Via container `stripe-cli` do Docker Compose:**
   ```bash
   docker compose --profile stripe up -d stripe-cli
   docker compose logs -f stripe-cli
   ```
2. **Via Stripe CLI instalado localmente:**
   ```bash
   stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded --forward-to http://localhost:8080/api/payments/webhook
   ```
   Copie o `whsec_...` exibido pelo comando para `STRIPE_WEBHOOK_SECRET` no `.env` e reinicie o backend (`docker compose up -d backend`).

## Como rodar os testes automatizados (Vitest)

Os testes cobrem cálculo de frete por CEP, reserva/devolução atômica de estoque em concorrência, idempotência do webhook, reembolso total, aplicação/devolução de cupons e máquina de estados de pedidos:

```bash
docker compose exec backend npm test
```

Para validar o build de produção do backend e do frontend:
```bash
docker compose exec backend npm run build
docker compose exec frontend npm run build
```

## Rotas Principais da API

### Autenticação e Conta
- `POST /api/auth/register`: Cadastro de usuário (com validação de dígitos verificadores de CPF)
- `POST /api/auth/login`: Login e emissão de JWT
- `POST /api/auth/forgot-password`: Solicita link de recuperação de senha (resposta sempre genérica; token salvo como hash SHA-256 com validade de 1h e uso único)
- `POST /api/auth/reset-password`: Redefine a senha usando o token de recuperação
- `GET /api/users/me`: Retorna perfil e lista de endereços salvos do usuário autenticado
- `PATCH /api/users/me`: Atualiza nome, telefone e endereço de entrega
- `PUT /api/users/me/password`: Altera a senha exigindo a senha atual

### Catálogo, Marcas e Categorias
- `GET /api/products`: Lista paginada de perfumes ativos (filtros: `search`, `brand`, `category`, `gender`, `olfactoryFamily`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`)
- `GET /api/products/olfactory-families`: Lista famílias olfativas disponíveis
- `GET /api/products/:id`: Detalhes de um perfume ativo (`404` se inativo ou inexistente)
- `GET /api/products/admin`: Lista paginada de produtos para o admin (inclui inativos e filtro de estoque baixo)
- `POST /api/products` | `PUT /api/products/:id`: Cria ou edita perfume (ADMIN)
- `PATCH /api/products/:id/active`: Ativa ou desativa perfume (ADMIN)
- `GET /api/products/brands` | `POST /api/products/brands` | `PUT /api/products/brands/:id` | `DELETE /api/products/brands/:id`: CRUD de marcas com bloqueio de exclusão caso haja produtos vinculados
- `GET /api/products/categories` | `POST /api/products/categories` | `PUT /api/products/categories/:id` | `DELETE /api/products/categories/:id`: CRUD de categorias com bloqueio de exclusão caso haja produtos vinculados

### Cupons, Frete, Pagamentos e Pedidos
- `GET /api/shipping/quote?zipCode=...`: Calcula frete e prazo por faixa de CEP
- `POST /api/coupons/validate`: Valida código de cupom e calcula o desconto no servidor
- `GET /api/coupons` | `POST /api/coupons` | `PUT /api/coupons/:id` | `DELETE /api/coupons/:id`: CRUD de cupons (ADMIN)
- `POST /api/payments/create-payment-intent`: Valida CPF/CEP/UF, reserva estoque e uso de cupom atomicamente, cria o `Order` (`PENDING`, expiração em 30 min) e cria o `PaymentIntent` na Stripe
- `POST /api/payments/webhook`: Processa `payment_intent.succeeded`, `payment_intent.payment_failed` e `charge.refunded` de forma idempotente
- `GET /api/orders/mine`: Lista paginada de pedidos do cliente autenticado
- `GET /api/orders/:id`: Detalhes de um pedido (dono ou ADMIN)
- `POST /api/orders/:id/payment-intent`: Retoma pagamento de pedido `PENDING` não expirado reutilizando o `PaymentIntent`
- `POST /api/orders/:id/cancel`: Cancela pedido `PENDING` do próprio cliente devolvendo estoque e cupom
- `GET /api/orders/admin`: Lista paginada e filtrável de todos os pedidos (ADMIN)
- `GET /api/orders/admin/export`: Exporta pedidos filtrados em CSV com BOM UTF-8 (ADMIN)
- `PATCH /api/orders/:id/status`: Atualiza status do pedido (`PAID → PROCESSING → SHIPPED → DELIVERED`, `PENDING/PAID/PROCESSING → CANCELLED`) (ADMIN)
- `POST /api/orders/:id/refund`: Cancela e reembolsa integralmente na Stripe pedidos `PAID` ou `PROCESSING`, devolvendo estoque e uso de cupom uma única vez (ADMIN)

### Dashboard e Clientes (Admin)
- `GET /api/admin/stats`: Métricas agregadas (receita e pedidos pagos de hoje, 7 e 30 dias, pedidos por status, top 5 mais vendidos e produtos com estoque baixo)
- `GET /api/admin/customers`: Lista paginada de clientes com busca, total de pedidos e valor total gasto
