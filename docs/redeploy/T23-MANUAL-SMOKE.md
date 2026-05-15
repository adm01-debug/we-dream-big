# T23 — Deploy Preview: Manual Smoke Checklist

**Data:** 2026-05-12  
**Branch:** `claude/fix-e2e-ci-tests-I8f4K`  
**Executor:** _preencher_  
**URL do preview:** _preencher após deploy na Vercel_

---

## Pré-requisitos

- [ ] Deploy de preview ativo na Vercel (branch `claude/fix-e2e-ci-tests-I8f4K`)
- [ ] Credenciais de teste: vendedor + admin disponíveis
- [ ] Devtools aberto na aba Network (filtro: `Fetch/XHR`)
- [ ] Console sem erros em vermelho antes de iniciar

---

## Checklist de Smoke Manual

### 1. Login

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 1.1 | Acessar `{preview_url}/login` | Página de login carrega em < 3s | ☐ |
| 1.2 | Login com credenciais inválidas | Mensagem de erro exibida, usuário permanece em `/login` | ☐ |
| 1.3 | Login com credenciais válidas (vendedor) | Redirecionamento para `/produtos` ou dashboard | ☐ |
| 1.4 | Header sticky visível pós-login | Header fixo no topo ao rolar a página | ☐ |

---

### 2. Catálogo — Carrega e filtra

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 2.1 | Navegar para `/produtos` | Grid de produtos visível em < 5s | ☐ |
| 2.2 | Abrir filtro de categoria | Painel de filtros expande sem erro | ☐ |
| 2.3 | Selecionar uma categoria | Produtos filtrados, URL atualizada com parâmetros | ☐ |
| 2.4 | Digitar texto na busca | Produtos filtrados em tempo real | ☐ |
| 2.5 | Limpar filtros | Grid retorna ao estado original | ☐ |
| 2.6 | Abrir detalhe de produto | Modal/página de detalhe abre com imagem e preço | ☐ |

---

### 3. Adicionar produto ao carrinho / orçamento

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 3.1 | Clicar em "Adicionar ao orçamento" em produto | Produto adicionado; contador no header atualiza | ☐ |
| 3.2 | Ajustar quantidade do produto | Quantidade atualiza; total recalculado | ☐ |
| 3.3 | Remover produto | Item removido sem erro de JS | ☐ |

---

### 4. Criar orçamento

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 4.1 | Navegar para `/orcamentos/novo` | Formulário de orçamento carrega | ☐ |
| 4.2 | Preencher cliente e adicionar 2+ produtos | Campos salvos; total calculado corretamente | ☐ |
| 4.3 | Salvar orçamento | Orçamento salvo com ID único; redirecionamento para detalhe | ☐ |
| 4.4 | Verificar autosave | Edição adicional salva automaticamente em < 5s | ☐ |

---

### 5. Aprovar desconto

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 5.1 | Solicitar desconto acima do limite (com vendedor) | Notificação enviada ao admin | ☐ |
| 5.2 | Login como admin | Admin vê solicitação pendente | ☐ |
| 5.3 | Admin aprova desconto | Orçamento atualizado com desconto aprovado | ☐ |
| 5.4 | Vendedor vê desconto aprovado | Notificação e desconto refletido no orçamento | ☐ |

---

### 6. Gerar PDF

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 6.1 | Abrir orçamento existente | Botão "Gerar PDF" visível | ☐ |
| 6.2 | Clicar em "Gerar PDF" | PDF gerado e download iniciado em < 10s | ☐ |
| 6.3 | Abrir PDF gerado | Documento contém produtos, preços e dados do cliente | ☐ |

---

### 7. Kit colaborativo

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 7.1 | Navegar para `/kit-builder` | Tela de kit-builder carrega sem erro | ☐ |
| 7.2 | Adicionar 3+ produtos ao kit | Produtos adicionados; total calculado | ☐ |
| 7.3 | Renomear kit | Nome salvo corretamente | ☐ |
| 7.4 | Compartilhar kit | Link de compartilhamento gerado (se funcionalidade disponível) | ☐ |

---

### 8. Mockup gerado

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 8.1 | Navegar para `/mockup` | Redirecionamento para login (sem auth) OU mockup studio carrega | ☐ |
| 8.2 | Selecionar produto e template | Preview do mockup renderiza sem erro | ☐ |
| 8.3 | Aplicar logo/imagem | Mockup atualiza com a imagem aplicada | ☐ |

---

### 9. BI / Analytics

| Passo | Ação | Resultado esperado | Status |
|-------|------|--------------------|--------|
| 9.1 | Navegar para `/admin/bi` (como admin) | Painel de BI carrega com dados | ☐ |
| 9.2 | Verificar gráfico de vendas | Gráfico renderiza com dados do período atual | ☐ |
| 9.3 | Aplicar filtro de período | Dados atualizam corretamente | ☐ |

---

## Observabilidade pós-smoke

| Check | Resultado | Status |
|-------|-----------|--------|
| Console sem erros 5xx durante o smoke | — | ☐ |
| Sentry sem novos issues críticos (P0) | — | ☐ |
| Edge Functions respondendo (health check) | — | ☐ |
| Latência p95 < 500ms no painel Vercel Analytics | — | ☐ |

---

## Resultado Final

| Status geral | Observações |
|-------------|-------------|
| ☐ **PASS** — todos os itens verde | — |
| ☐ **FAIL** — itens bloqueadores detectados | _lista de falhas_ |
| ☐ **PARTIAL** — não-bloqueadores; deploy pode prosseguir | _riscos documentados_ |

**Executor:** ___________________  
**Data/hora:** ___________________  
**URL validada:** ___________________
