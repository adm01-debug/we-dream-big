# 🧪 Smoke Test — D.1.1 Storage Policies

> Executar APÓS aplicar patch + validate. Manual no Supabase Dashboard.

## ✅ Checklist

### 1. Buckets visíveis no Dashboard
- [ ] Acessar https://supabase.com/dashboard/project/doufsxqlfjyuvxuezpln/storage/buckets
- [ ] Confirmar que aparecem 7 buckets: `scripts`, `component-media`, `mockup-art-files`, `personalization-images`, `product-videos`, `quarantine`, `supplier-logos`

### 2. Upload como admin
- [ ] Logar como admin no app
- [ ] Tentar upload em `component-media` → deve funcionar
- [ ] Tentar upload em `product-videos` (vídeo <100MB) → deve funcionar
- [ ] Tentar upload em `supplier-logos` (imagem <2MB) → deve funcionar

### 3. Bloqueio de não-admin
- [ ] Logar como usuário comum (vendedor)
- [ ] Tentar upload em `component-media` → deve **FALHAR** (não é admin)
- [ ] Tentar upload em `personalization-images` (próprio path) → deve **funcionar**
- [ ] Tentar upload em `personalization-images` (path de outro user) → deve **FALHAR**

### 4. Logs do GlitchTip
- [ ] Após 1 hora de uso, abrir GlitchTip e filtrar por "storage"
- [ ] Confirmar ZERO erros de "permission denied" em fluxos legítimos
- [ ] Se houver erros: anotar e ajustar policies caso necessário

## ❌ Se falhar
Rodar `rollback.sql` imediatamente. Investigar logs do Postgres pra entender o motivo.
