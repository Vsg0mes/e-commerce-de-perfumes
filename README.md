# E-commerce de Perfumes

Este projeto acadêmico implementa um e-commerce completo de perfumes.

## Tecnologias Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, React Router DOM.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, bcrypt, jsonwebtoken, Helmet.
- **Banco de Dados:** PostgreSQL.
- **Infraestrutura:** Docker e Docker Compose.
- **Pagamentos:** Integração real com o Stripe (SDK Oficial Node.js, Checkout Session).

## Arquitetura

O sistema é dividido em dois serviços principais e um banco de dados, orquestrados pelo Docker:
1. `backend/`: API REST Node.js (porta 3333).
2. `frontend/`: Aplicação React/Vite (porta 5173).
3. `postgres`: Banco de dados PostgreSQL (porta 5432).

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
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin criado pelo seed. Em produção são obrigatórios; em desenvolvimento, sem `ADMIN_PASSWORD`, uma senha aleatória é gerada e impressa uma única vez |

## Como executar (Docker)

Para iniciar todos os serviços, execute na raiz do projeto:

```bash
docker compose up -d --build
```

O backend deve aguardar o banco estar disponível (Healthcheck) antes de inicializar.

## Como executar Migrations e Seed

Após os containers estarem rodando:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
```

Isso criará o esquema do banco de dados e adicionará marcas, categorias, perfumes fictícios e o usuário admin definido por `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Se o admin já existir, a senha não é sobrescrita.

## Como acessar

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3333/api/health](http://localhost:3333/api/health)

## Rotas Principais da API

### Autenticação
- `POST /api/auth/register`: Cadastro de usuário
- `POST /api/auth/login`: Login e emissão de JWT

### Produtos (Catálogo)
- `GET /api/products`: Lista perfumes (paginação, filtros)
- `GET /api/products/:id`: Detalhes do perfume
- `POST /api/products`: Cria um perfume (Requer ADMIN)

### Pedidos & Pagamentos
- `POST /api/orders`: Cria pedido e gera URL de Checkout (Stripe)
- `POST /api/payments/webhook`: Webhook para receber confirmação de pagamento

## Integração de Pagamento (Stripe)

Ao finalizar o carrinho e submeter o checkout, o backend cria um registro de `Order` (PENDING) e chama a API do Stripe para gerar uma Checkout Session. A URL é devolvida ao frontend, que redireciona o usuário.

Após o pagamento (cartão, etc), o Stripe dispara um POST para a rota `/api/payments/webhook`. O sistema valida, consulta o status real do pagamento, e atualiza o status do `Order` e dá baixa no estoque.

## Decisões Arquiteturais

1. **Separação de Responsabilidades:** Utilizou-se Prisma para camada de repositório, Controllers para requisição/resposta, isolando a regra de negócio do roteamento.
2. **Segurança no Webhook:** O webhook verifica com a API original se o ID de pagamento informado realmente existe e se está aprovado antes de abater o estoque, evitando ataques de spoofing.
3. **Zustand no Frontend:** Foi escolhido por sua leveza em relação ao Redux para armazenar o estado global do carrinho de forma síncrona.
4. **Tailwind CSS:** Para entrega rápida de uma UI sofisticada e responsiva.
