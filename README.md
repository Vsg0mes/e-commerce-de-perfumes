# E-commerce de Perfumes

Este projeto acadêmico implementa um e-commerce completo de perfumes.

## Tecnologias Utilizadas

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Zustand, React Router DOM.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, bcrypt, jsonwebtoken, Helmet.
- **Banco de Dados:** PostgreSQL.
- **Infraestrutura:** Docker e Docker Compose.
- **Pagamentos:** Integração real com o Mercado Pago (SDK Oficial Node.js).

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
Preencha os valores de `PAYMENT_ACCESS_TOKEN` e `PAYMENT_WEBHOOK_SECRET` com as credenciais do seu painel do Mercado Pago.

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

Isso criará o esquema do banco de dados e adicionará marcas, categorias, perfumes fictícios e um usuário admin (`admin@ecommerce.com` / `admin123`).

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
- `POST /api/orders`: Cria pedido e gera URL de Checkout (Mercado Pago)
- `POST /api/payments/webhook`: Webhook para receber confirmação de pagamento

## Integração de Pagamento (Mercado Pago)

Ao finalizar o carrinho e submeter o checkout, o backend cria um registro de `Order` (PENDING) e chama a API do Mercado Pago para gerar uma preferência de pagamento (`Preference`). A URL é devolvida ao frontend, que redireciona o usuário.

Após o pagamento (via PIX, Cartão, etc), o Mercado Pago dispara um POST para a rota `/api/payments/webhook`. O sistema valida, consulta o status real do pagamento, e atualiza o status do `Order` e dá baixa no estoque.

## Decisões Arquiteturais

1. **Separação de Responsabilidades:** Utilizou-se Prisma para camada de repositório, Controllers para requisição/resposta, isolando a regra de negócio do roteamento.
2. **Segurança no Webhook:** O webhook verifica com a API original se o ID de pagamento informado realmente existe e se está aprovado antes de abater o estoque, evitando ataques de spoofing.
3. **Zustand no Frontend:** Foi escolhido por sua leveza em relação ao Redux para armazenar o estado global do carrinho de forma síncrona.
4. **Tailwind CSS:** Para entrega rápida de uma UI sofisticada e responsiva.
