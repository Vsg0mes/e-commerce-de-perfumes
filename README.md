# E-commerce de Perfumes

Este projeto implementa um e-commerce completo de perfumes.

## Tecnologias Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, React Router DOM, Stripe Payment Element.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, bcrypt, jsonwebtoken, Helmet, Zod.
- **Banco de Dados:** PostgreSQL.
- **Infraestrutura:** Docker, Docker Compose e Nginx.
- **Pagamentos:** Integração com o Stripe via PaymentIntent (`@stripe/stripe-js` + SDK oficial Node.js + Webhooks assinados).

## Arquitetura

O sistema é orquestrado pelo Docker Compose com proxy reverso Nginx (porta 8080):
1. `backend/`: API REST Node.js (porta interna 3333).
2. `frontend/`: Aplicação React/Vite (porta interna 5173).
3. `postgres`: Banco de dados PostgreSQL (porta interna 5432).
4. `nginx`: Proxy reverso expondo `http://localhost:8080` (`/api` → backend, `/` → frontend).

## Pré-requisitos

- Docker
- Docker Compose

## Como configurar o `.env`

Copie o arquivo de exemplo para gerar suas variáveis de ambiente:
```bash
cp .env.example .env
```
Preencha **todas** as variáveis obrigatórias (o `docker compose up` falha com mensagem clara se alguma faltar):

| Variável | Descrição |
|---|---|
| `POSTGRES_PASSWORD` | Senha do banco (use a mesma em `DATABASE_URL`) |
| `JWT_SECRET` | Segredo dos tokens. Gere com `openssl rand -hex 32` (mín. 32 caracteres em produção; valores fracos como `changeme` são rejeitados) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Credenciais do seu painel Stripe (modo teste) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe (`pk_test_...`) usada pelo Payment Element no frontend |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin criado pelo seed. Em produção são obrigatórios; em desenvolvimento, sem `ADMIN_PASSWORD`, uma senha aleatória é gerada e impressa uma única vez |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Configuração opcional de SMTP (Nodemailer) para e-mails transacionais e recuperação de senha. Em desenvolvimento, se `SMTP_HOST` estiver vazio, os e-mails são exibidos no log do backend |

## Como executar (Docker)

Para iniciar todos os serviços, execute na raiz do projeto:

```bash
docker compose up -d --build
```

O backend aguarda o banco estar saudável (healthcheck) antes de inicializar.

## Como executar Migrations e Seed

Após os containers estarem rodando:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

Isso aplicará todas as migrations do esquema do banco de dados e adicionará marcas, categorias, perfumes fictícios e o usuário admin definido por `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Se o admin já existir, a senha não é sobrescrita.

## Como acessar

- **Aplicação (via Nginx):** [http://localhost:8080](http://localhost:8080)
- **Healthcheck da API:** [http://localhost:8080/api/health](http://localhost:8080/api/health)

## Rotas Principais da API

### Autenticação e Perfil
- `POST /api/auth/register`: Cadastro de usuário
- `POST /api/auth/login`: Login e emissão de JWT
- `GET /api/users/me`: Dados e endereço mais recente do usuário autenticado
- `PATCH /api/users/me`: Atualiza nome, telefone e endereço do usuário autenticado
- `PUT /api/users/me/password`: Altera a senha do usuário autenticado

### Produtos (Catálogo)
- `GET /api/products`: Lista perfumes (paginação, filtros)
- `GET /api/products/:id`: Detalhes do perfume
- `GET /api/products/brands`: Lista marcas
- `GET /api/products/categories`: Lista categorias
- `POST /api/products`: Cria um perfume (Requer ADMIN)
- `PUT /api/products/:id`: Atualiza um perfume (Requer ADMIN)
- `DELETE /api/products/:id`: Remove um perfume (Requer ADMIN)

### Frete, Pedidos & Pagamentos
- `GET /api/shipping/quote?zipCode=...`: Cotação de frete e prazo por CEP
- `POST /api/payments/create-payment-intent`: Reserva o estoque atomicamente, cria o `Order` (`PENDING`, com expiração em 30 minutos) e gera o `PaymentIntent` no Stripe retornando o `clientSecret`
- `POST /api/payments/webhook`: Webhook assinado da Stripe (`payment_intent.succeeded` e `payment_intent.payment_failed`)
- `GET /api/orders/mine`: Lista paginada dos pedidos do cliente logado
- `GET /api/orders/admin`: Lista paginada e filtrável de todos os pedidos (Requer ADMIN)
- `GET /api/orders/:id`: Detalhes de um pedido (apenas dono do pedido ou ADMIN)
- `PATCH /api/orders/:id/status`: Atualiza o status de um pedido (Requer ADMIN)

## Integração de Pagamento (Stripe PaymentIntent)

Ao finalizar o checkout, o frontend envia apenas os IDs/quantidades dos itens e os dados de entrega para `POST /api/payments/create-payment-intent`. O servidor recalcula preços e frete a partir do banco, reserva o estoque de cada item de forma atômica (`$transaction` + `updateMany` condicional), cria o registro `Order` com `status = PENDING` e `expiresAt = agora + 30 min`, e cria um `PaymentIntent` na Stripe devolvendo o `clientSecret` para o `PaymentElement` do frontend.

Após o processamento do pagamento na Stripe:
- `payment_intent.succeeded`: o webhook valida a assinatura e o valor cobrado e marca o pedido como `PAID` / `APPROVED` de forma idempotente (o estoque já foi reservado na criação). Caso o pagamento chegue para um pedido já expirado/cancelado, o sistema registra o pagamento sem reabater estoque silenciosamente e marca `needsManualReview = true`.
- `payment_intent.payment_failed`: o webhook marca o pagamento como `REJECTED`, cancela o pedido e devolve o estoque reservado uma única vez.
- Um job periódico (`expirePendingOrders`, a cada 5 minutos) cancela pedidos `PENDING` vencidos (`expiresAt < agora`), cancela o `PaymentIntent` correspondente na Stripe e devolve o estoque reservado de forma idempotente.

## Decisões Arquiteturais

1. **Separação de Responsabilidades:** Utilizou-se Prisma para camada de persistência e Controllers com validação Zod para requisição/resposta.
2. **Reserva Atômica e Idempotência:** Reservas e devoluções de estoque usam transações com `updateMany` condicional (lock otimista), evitando estoque negativo em compras simultâneas e duplicidade em reentregas de webhook.
3. **Zustand no Frontend:** Gerenciamento leve do estado global de autenticação, tema e carrinho.
4. **Tailwind CSS:** Interface responsiva com suporte a modo escuro.
