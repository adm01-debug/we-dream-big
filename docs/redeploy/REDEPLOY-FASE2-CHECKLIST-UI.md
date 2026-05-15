# Redeploy Fase 2 — Checklist UI Final

> **Para quem:** Joaquim (único maintainer, não-dev)
> **Tempo total:** ~10 minutos
> **Objetivo:** fechar as 3 pendências da Fase 2 que **só** funcionam via UI (limitação técnica documentada, não preguiça).
> **Quando rodar:** quando a PR consolidada do Claude (que adiciona o CI guard e atualiza docs) estiver mergeada em `main`.

---

## ⏱ Resumo de cliques

| Passo | UI | Cliques | Tempo |
|---|---|---|---|
| 1 — Policy de leitura do bucket recibos | Supabase Dashboard | ~7 | 2 min |
| 2 — Dependabot Alerts + Secret Scanning | GitHub Settings → Security | ~5 toggles | 2 min |
| 3 — Branch Protection em `main` | GitHub Settings → Branches | ~10 checkboxes | 5 min |

Total: ~10 min. Faça **na ordem** abaixo (alguns passos dependem do anterior).

---

## Passo 1 — Storage policy `recibos_authenticated_read`

### Por que é manual

Tentei criar via MCP/SQL 3 vezes e Supabase bloqueia (`42501: must be owner of relation objects`). A tabela `storage.objects` pertence ao role `supabase_storage_admin` e nenhum role acessível via MCP é membro dele. Detalhes em `docs/storage/PUBLIC_BUCKETS.md`.

As outras 2 policies do mesmo bucket (`_write`, `_update`) também foram criadas via dashboard antes — então o caminho é conhecido.

### Cliques exatos

1. Abra: **<https://supabase.com/dashboard/project/doufsxqlfjyuvxuezpln/storage/policies>**
2. Procure a seção/tabela **`objects`** (schema **`storage`**)
3. Clique no botão **`+ New policy`** (canto direito do bloco `storage.objects`)
4. Escolha o template **`For full customization`** (não use os templates pré-prontos — eles adicionam cláusulas que não queremos)
5. Preencha o formulário **exatamente assim**:

   | Campo | Valor |
   |---|---|
   | Policy name | `recibos_authenticated_read` |
   | Allowed operation | ☑ SELECT (deixar UPDATE/INSERT/DELETE desmarcados) |
   | Target roles | `authenticated` (remover `public` se vier marcado) |
   | USING expression | `bucket_id = 'recibos-entrega'` |
   | WITH CHECK expression | (deixar vazio) |

6. Clique **`Review`** → confira o SQL gerado deve ser equivalente a:
   ```sql
   CREATE POLICY "recibos_authenticated_read" ON storage.objects
     FOR SELECT TO authenticated USING (bucket_id = 'recibos-entrega');
   ```
7. Clique **`Save policy`**

### Validação

Se quiser confirmar (opcional), no SQL Editor:

```sql
SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'recibos%';
```

Esperado: **3 linhas** (`_read`, `_write`, `_update`).

---

## Passo 2 — Security Analysis (issue #80)

### Cliques exatos

1. Abra: **<https://github.com/adm01-debug/Promo_Gifts/settings/security_analysis>**
2. Ative na ordem (clique no botão `Enable` de cada um):
   - ☑ **Dependency graph** (provável que já esteja on)
   - ☑ **Dependabot alerts**
   - ☑ **Dependabot security updates**
   - ☑ **Secret scanning**
   - ☑ **Push protection** (esse é o crítico — bloqueia secret ANTES do push subir)

Não precisa configurar nada além disso. Os toggles são instantâneos.

### Validação

- <https://github.com/adm01-debug/Promo_Gifts/security/dependabot> — deve responder com listagem (vazia ou populada — qualquer dos dois é OK)
- Teste push protection (opcional — pode pular):

  > ⚠️ **Use SEMPRE uma branch descartável**, nunca `main`. Alguns padrões de secret só são detectados quando ID + secret aparecem **no mesmo arquivo** (GitHub doc oficial). Se rodar o teste sem esse cuidado e o GitHub não bloquear, o "secret" fictício acaba no remoto e `git reset HEAD~1` só limpa local.

  ```bash
  # Cria branch descartável a partir de main:
  git checkout -b test/secret-scan-validation

  # Par AWS Access Key ID + Secret no MESMO arquivo (padrão genuinamente detectado):
  cat > fake-secret.txt <<'EOF'
  AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
  AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  EOF
  git add -f fake-secret.txt && git commit -m "test: secret scanning push protection"
  git push -u origin test/secret-scan-validation

  # Esperado: "remote: error: GH013: Repository rule violations found ... push declined due to a detected secret"

  # Limpeza local + remoto (se push tiver passado por acidente, deleta a branch remota junto):
  git checkout main
  git branch -D test/secret-scan-validation
  git push origin --delete test/secret-scan-validation 2>/dev/null || true
  rm -f fake-secret.txt
  ```

### Fechar issue

Após ativar, vá em <https://github.com/adm01-debug/Promo_Gifts/issues/80> e clique `Close issue` com comentário tipo: *"Ativado em 2026-05-12. Dependabot + Secret Scanning + Push Protection on."*

---

## Passo 3 — Branch Protection em `main` (issue #78)

### ⚠️ Nuance importante para você (único maintainer)

A doc original da Fase 2 pediu `Require approvals = 1`. **Se você ativar isso sendo único maintainer, NENHUMA PR sua vai conseguir mergar** (GitHub não deixa você aprovar a própria PR). Duas opções:

- **Opção A (recomendada para você agora):** `Require approvals = 0` mas mantém **todas as outras travas** (status checks obrigatórios, sem force push, sem delete, conversation resolved). Isso bloqueia push direto e exige CI verde, sem exigir 2ª pessoa.
- **Opção B:** Manter `= 1` mas habilitar **"Allow specified actors to bypass required pull requests"** e adicionar você mesmo como bypass. Menos rigoroso.

A instrução abaixo segue a Opção A.

### Cliques exatos

1. Abra: **<https://github.com/adm01-debug/Promo_Gifts/settings/branches>**
2. Clique **`Add branch ruleset`** (ou `Add classic branch protection rule` se a UI ainda mostrar isso)
3. **Ruleset name**: `main-protection`
4. **Enforcement status**: `Active`
5. **Target branches** → `Add target` → `Include default branch`
6. Em **Branch protections**, marcar:

   | Toggle | Estado | Configuração detalhada |
   |---|---|---|
   | Restrict deletions | ✅ ON | — |
   | Block force pushes | ✅ ON | — |
   | Require linear history | ⬜ OFF (opcional) | — |
   | Require a pull request before merging | ✅ ON | **Required approvals: 0** · Dismiss stale ✅ · Require conversation resolution ✅ |
   | Require status checks to pass | ✅ ON | Require branches to be up to date ✅. **Add checks** abaixo |
   | Block creations | ⬜ OFF | — |
   | Require deployments to succeed | ⬜ OFF | — |
   | Require code scanning results | ⬜ OFF por ora | Pode ligar depois quando CodeQL tiver baseline |

7. Em **Require status checks**, adicione **apenas os checks que rodam em PR** (digite cada um — autocomplete vai sugerir após primeiro run em uma PR):
   - `Gitleaks — Secret Scan` (workflow `security.yml`, roda em `pull_request` + `push`)
   - `Smoke tests (rotas + health-check)` (workflow `ci.yml`, job `smoke`, roda em `pull_request` + `push`)
   - `Lint, Typecheck & Test` (workflow `ci.yml`, job `quality`, roda em `pull_request` + `push`)
   - `Analyze (javascript-typescript)` (workflow `codeql.yml`, job `analyze` com matrix `language: javascript-typescript`, roda em `pull_request` + `push`. **Não use** "CodeQL" — esse é o nome do workflow, não do check. O check publica com o nome do job expandido pela matrix.)

   > ⚠️ **NÃO adicione** `Verify push to main is from PR merge` (workflow `branch-protection-sentinel.yml`) como required check. Esse workflow tem trigger `push:` apenas — não roda em PR. Se for marcado como required, **todas as PRs ficam presas esperando um check que nunca aparece no head da PR**. O sentinel continua executando pós-merge para auditar o padrão; não precisa ser gate de PR.
   >
   > Se algum dos 4 checks acima não aparecer no autocomplete, é porque o workflow ainda não rodou em nenhuma PR — abra/atualize qualquer PR pequena para disparar 1×, depois adicione.

8. Em **Bypass list**: deixar vazio (não dê bypass nem para admin — assim mantém disciplina).
9. **Create** (botão no topo).

### Validação

```bash
# Tentar push direto — deve falhar:
git checkout main && git pull
git commit --allow-empty -m "test direct push"
git push origin main
# Esperado: ! [remote rejected] main -> main (protected branch hook declined)
git reset HEAD~1
```

### Fechar issue

Após validar, vá em <https://github.com/adm01-debug/Promo_Gifts/issues/78> e clique `Close issue` com comentário: *"Branch protection ativa em main com 5 required checks. Validado em 2026-05-12."*

---

## Após os 3 passos

Avise o Claude (este chat ou próximo). Ele vai:

1. Re-rodar os advisors do Supabase
2. Confirmar a 3ª policy criada
3. Verificar issues #78 e #80 fechadas
4. Atualizar `docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md` para marcar a Fase 2 como **100% concluída**
5. Propor início da Fase 3 (T24-T30): E2E coverage, CI estabilidade, observability, qualidade, docs finais

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| Não vejo botão `+ New policy` no Supabase | Estou no projeto errado | URL deve ter `doufsxqlfjyuvxuezpln` |
| Required check não aparece no autocomplete do GitHub | Workflow nunca rodou na branch ainda | Crie qualquer PR pequena para disparar; depois adicione |
| Push em main funciona mesmo após branch protection | Você é admin e bypass está ativo | Confirme Bypass list vazia |
| Issue #78 já está fechada | Alguém marcou antes da validação real | Reabrir; validar com um `git push` direto e simples (sem `--force`) — a rejeição "protected branch hook declined" já comprova proteção ativa; depois fechar com evidência |
