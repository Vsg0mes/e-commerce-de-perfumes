# Achados de Segurança e Melhorias Fora do Escopo

Este documento registra observações identificadas durante a evolução do projeto que estão fora do escopo funcional imediato de cada tarefa.

## Segurança

1. **Ausência de Rate Limiting em rotas de autenticação e criação de pagamento:**
   - Rotas como `POST /api/auth/login`, `POST /api/auth/register` e `POST /api/payments/create-payment-intent` não possuem limitação de requisições por IP/usuário (`express-rate-limit`), ficando expostas a força bruta de credenciais ou esgotamento temporário de estoque por reservas repetidas (mitigado parcialmente pela expiração automática em 30 minutos).
2. **Revogação de sessões JWT ao alterar senha:**
   - Os tokens JWT têm validade de 1 dia e são stateless; ao trocar a senha em `PUT /api/users/me/password`, tokens emitidos anteriormente permanecem válidos até expirarem.
3. **Validação de upload de imagens baseada apenas em MIME/extensão:**
   - `backend/src/middlewares/upload.middleware.ts` valida `file.mimetype` e extensão, mas não inspeciona a assinatura binária (magic bytes) do arquivo enviado.

## Funcionalidades Fora do Escopo (Sugestões Futuras)

- Integração direta com APIs de transportadoras (Correios / Melhor Envio) usando peso e dimensões reais dos frascos.
- Emissão automatizada de NF-e após confirmação de pagamento.
- Suporte a múltiplas variantes de volume (ex.: 50ml, 100ml, 200ml) e galeria com múltiplas fotos por produto.
- Sistema de avaliações e notas por clientes que compraram o produto (`DELIVERED`).
- SSR/pré-renderização e metadados OpenGraph dinâmicos para SEO nas páginas de produto.
