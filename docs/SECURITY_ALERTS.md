# 🛡️ Security Alerts — Configuração Completa

Este repo tem 4 camadas de defesa de segurança. As 2 primeiras já estão como código (este PR adiciona a 4ª). As 2 do meio precisam ser ativadas no UI.

| # | Camada | Onde | Status |
|---|---|---|---|
| 1 | Gitleaks (segredos no diff) | `.github/workflows/security.yml` | ✅ Ativo (mergeado anteriormente) |
| 2 | Dependabot Updates (PRs de bumps) | `.github/dependabot.yml` | ✅ Ativo (mergeado anteriormente) |
| 3 | Dependabot Security Alerts (CVEs) | UI Settings → Code security | ⏳ **Ativar** |
| 4 | Code Scanning (CodeQL) | `.github/workflows/codeql.yml` | ✅ Ativo (este PR) |
| 5 | Secret Scanning Alerts (segredos publicados) | UI Settings → Code security | ⏳ **Ativar** |

---

## 1. Dependabot Security Alerts (camada 3)

### O que é

Diferente do Dependabot Updates (camada 2, que abre PRs de bump rotineiros), o **Security Alerts** monitora a base de dados pública de CVEs e abre alertas/PRs **emergenciais** quando uma vulnerabilidade conhecida é publicada para uma dependência que você usa.

Exemplo real: se `next-auth@4.22.0` ganhar um CVE crítico amanhã, o Dependabot abre um alerta + PR para a versão patchada **automaticamente**, sem esperar a janela semanal.

### Como ativar

1. Acessar https://github.com/adm01-debug/Promo_Gifts/settings/security_analysis
2. Em **Dependency graph**: ☑ Enabled
3. Em **Dependabot alerts**: ☑ Enabled
4. Em **Dependabot security updates**: ☑ Enabled (cria PRs automáticos)

### Validação

Após ativar, ir em https://github.com/adm01-debug/Promo_Gifts/security/dependabot. Deve listar todos os alertas conhecidos para o `package-lock.json` atual.

---

## 2. Code Scanning (camada 4) — CodeQL

### O que é

CodeQL é o scanner de análise estática do GitHub. Roda no CI a cada PR + cron semanal e detecta padrões de bugs/vulns no **código fonte** (não nas dependências):

- SQL injection
- XSS
- Path traversal
- Hardcoded credentials (complementa Gitleaks)
- Comparações inseguras
- Uso de APIs deprecadas

### Onde está

`.github/workflows/codeql.yml` — workflow oficial do GitHub para JavaScript/TypeScript.

### Configuração padrão

- Triggers: `push` em main, todo PR contra main, cron toda segunda 09:00 UTC
- Linguagens: javascript-typescript
- Queries: `security-extended` (mais rigoroso que o default)

### Onde ver os resultados

Após o primeiro run completar, ir em https://github.com/adm01-debug/Promo_Gifts/security/code-scanning.

---

## 3. Secret Scanning Alerts (camada 5)

### O que é

Diferente do Gitleaks (camada 1, que roda **localmente no CI**), o Secret Scanning é um serviço do **GitHub que escaneia commits publicados** procurando padrões de tokens conhecidos (AWS, Stripe, GitHub PATs, etc.). Quando detecta, **notifica o provedor automaticamente** para revogação.

### Como ativar

1. Acessar https://github.com/adm01-debug/Promo_Gifts/settings/security_analysis
2. Em **Secret scanning**: ☑ Enabled
3. Em **Push protection**: ☑ Enabled (bloqueia o push antes mesmo de chegar no GitHub)

### Por que ambos os modos

- Sem Push Protection: secret exposto → alerta → você corre para revogar (situação atual)
- Com Push Protection: push é bloqueado → secret nunca chega ao GitHub → não há o que revogar

Push Protection elimina a janela de exposição. Vale a pena.

---

## 4. Resumo da política

- **Gitleaks** (CI) bloqueia merges de PRs com segredos
- **Dependabot Updates** (semanal) mantém deps atualizadas em ritmo previsível
- **Dependabot Security Alerts** (real-time) reage a CVEs publicados
- **CodeQL** (PR + cron) varre código por padrões inseguros
- **Secret Scanning + Push Protection** (real-time) bloqueia secrets antes do push

Camadas 1-2-4 são código (controladas via PRs). Camadas 3 e 5 são toggles UI controlados por você.
