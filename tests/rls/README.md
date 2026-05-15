# RLS Test Suite

Cobertura: 3 personas × tabelas sensíveis.

## Personas
| Persona | Email | Role |
|---------|-------|------|
| `anon` | (sem login) | — |
| `seller` | `seller-test@discount-approval.test` | `vendedor` |
| `admin` | `admin-test@discount-approval.test` | `admin` |

## Setup
1. Crie usuários via Admin API (ver `seed_discount_test_users` SQL function)
2. Defina senha conhecida nos secrets de teste: `TEST_SELLER_PASSWORD`, `TEST_ADMIN_PASSWORD`
3. Rode: `npm run test -- tests/rls`

## Matriz de cobertura

| Tabela | anon SELECT | seller SELECT | admin SELECT | seller INSERT |
|--------|-------------|---------------|--------------|---------------|
| `quotes` | ❌ | ✅ próprias | ✅ todas | ✅ |
| `orders` | ❌ | ✅ próprias | ✅ todas | ❌ (via trigger quote→order) |
| `discount_approval_requests` | ❌ | ✅ próprias | ✅ todas | ✅ |
| `workspace_notifications` | ❌ | ✅ próprias | ✅ próprias | ❌ |
| `user_roles` | ❌ | ✅ próprias | ✅ todas | ❌ |
| `profiles` | ❌ | ✅ próprias | ✅ todas | ✅ próprias |
| `quote_approval_tokens` | ✅ via RPC `get_quote_token_by_value` | ✅ próprias | ✅ todas | ✅ |
| `ai_usage_logs` | ❌ | ✅ próprias | ✅ todas | ❌ (via RPC) |
| `bot_detection_log` | ❌ | ❌ | ✅ | ❌ |
| `ip_access_control` | ❌ | ❌ | ✅ | ❌ |
| `login_attempts` | ❌ | ❌ | ✅ | ❌ |

## Status
Suite estrutural pronta. Implementação completa requer credenciais de teste configuradas no CI (bloqueado pendente decisão de admin).
