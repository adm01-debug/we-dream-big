# 🚫 POLÍTICA DE IDIOMA - GIFTS-STORE

> **Data:** 26/12/2025  
> **Status:** 🔴 DEFINITIVO - NÃO NEGOCIÁVEL  
> **Repositório:** https://github.com/adm01-debug/gifts-store

---

## 🇧🇷 DECISÃO DE NEGÓCIO: EXCLUSIVAMENTE PORTUGUÊS DO BRASIL

### ❌ **PROIBIÇÕES ABSOLUTAS:**

1. **PROIBIDO** implementar i18n (internacionalização)
2. **PROIBIDO** adicionar suporte multi-idioma
3. **PROIBIDO** usar bibliotecas como:
   - react-i18next
   - next-i18next
   - react-intl
   - formatjs
   - polyglot
   - @lingui/react
   - Qualquer outra biblioteca de tradução

4. **PROIBIDO** criar arquivos/pastas:
   - `i18n/`
   - `locales/`
   - `translations/`
   - `lang/`
   - Arquivos `*.i18n.ts` ou `*.i18n.js`

5. **PROIBIDO** usar funções de tradução:
   - `useTranslation()`
   - `t()`
   - `i18n.t()`
   - `translate()`
   - `__()` ou `_()`

6. **PROIBIDO** planejar expansão internacional no roadmap

---

## ✅ **REGRAS OBRIGATÓRIAS:**

1. **TODO código-fonte** em português (variáveis, funções, comentários)
2. **TODA interface** em português do Brasil
3. **TODA documentação** em português
4. **Locale FIXO:** `pt-BR`
5. **Timezone FIXO:** `America/Sao_Paulo`
6. **Moeda FIXA:** Real brasileiro (R$)
7. **Formato de data:** `dd/MM/yyyy`
8. **Formato de hora:** `HH:mm` (24h)

---

## 📋 **CONFIGURAÇÕES OBRIGATÓRIAS:**

### **date-fns:**
```typescript
import { ptBR } from 'date-fns/locale';

// SEMPRE usar locale pt-BR
format(date, 'dd/MM/yyyy', { locale: ptBR });
```

### **react-day-picker (Calendar):**
```tsx
import { ptBR } from 'date-fns/locale';

<DayPicker locale={ptBR} />
```

### **Configuração global:**
```typescript
// src/lib/locale-config.ts
import { setDefaultOptions } from 'date-fns';
import { ptBR } from 'date-fns/locale';

setDefaultOptions({ locale: ptBR });
```

---

## 🎯 **JUSTIFICATIVA DA DECISÃO:**

### **Motivos técnicos:**
1. ✅ Simplicidade do código (sem abstração de tradução)
2. ✅ Performance (sem overhead de i18n)
3. ✅ Menos dependências
4. ✅ Menos complexidade de manutenção
5. ✅ Bundle menor

### **Motivos de negócio:**
1. ✅ Foco no mercado brasileiro
2. ✅ Não há plano de expansão internacional
3. ✅ Cliente é 100% brasileiro
4. ✅ Equipe fala português
5. ✅ Integrações são locais (Bitrix24 BR, n8n BR)

---

## 📊 **SITUAÇÃO ATUAL DO PROJETO:**

### ✅ **Já está conforme:**
- Sem arquivos de tradução
- Sem dependências de i18n
- Sem uso de funções de tradução
- Código majoritariamente em português

### ⚠️ **Única pendência:**
- Configurar locale pt-BR no date-fns (já documentado)

---

## 🚀 **ROADMAP ATUALIZADO (SEM i18n):**

### **Q1 2026:**
- Estabilidade, Performance, Testes

### **Q2 2026:**
- Novas Features, Integrações, UX

### **Q3 2026:**
- Escalabilidade, White-Label, Multi-tenant

### **Q4 2026:**
- IA Avançada, Mobile, API Pública

**🚫 REMOVIDO do roadmap:**
- ❌ Multi-idioma (i18n)
- ❌ Multi-moeda
- ❌ Expansão internacional

---

## 📝 **ALTERAÇÕES FEITAS NOS DOCUMENTOS:**

### **ANALISE_EXAUSTIVA_GIFTS_STORE.md:**
1. ✅ Adicionada seção "🇧🇷 Idioma e Localização"
2. ✅ Removido "Multi-idioma (i18n)" das melhorias de baixa prioridade
3. ✅ Removido "Multi-idioma/Multi-moeda" do Q4 2026
4. ✅ Removido "Expansão internacional" das recomendações de longo prazo

### **DIAGRAMAS_PROCESSOS_GIFTS_STORE.md:**
1. ✅ Removido "Multi-idioma" do roadmap visual de Jun 2025

### **REMOCAO_I18N_GIFTS_STORE.md:**
1. ✅ Criado guia de configuração pt-BR (sem i18n)
2. ✅ Enfatiza que NÃO há i18n para remover

---

## ⚠️ **ALERTA PARA DESENVOLVEDORES:**

### **Se alguém sugerir adicionar i18n:**

**RESPOSTA PADRÃO:**
> "O sistema é **exclusivamente em Português do Brasil** por decisão de negócio. Não há necessidade nem plano de internacionalização. Esta é uma decisão **definitiva e não negociável**."

### **Se Lovable sugerir tradução:**
**RECUSAR IMEDIATAMENTE:**
> "Não implementar i18n. Sistema é pt-BR only."

### **Se cliente pedir tradução futura:**
**ESCALAR PARA GESTÃO:**
> Isso mudaria a arquitetura fundamental do sistema. Precisa aprovação de negócio.

---

## 🎓 **BOAS PRÁTICAS:**

### ✅ **FAZER:**
```typescript
// Textos diretos em português
const message = "Orçamento criado com sucesso!";

// Datas formatadas em pt-BR
import { formatDate } from '@/lib/date-utils';
const formatted = formatDate(date); // 25/12/2025

// Moeda em reais
const price = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value); // R$ 1.234,56
```

### ❌ **NÃO FAZER:**
```typescript
// ❌ NUNCA usar chaves de tradução
const message = t('quotes.created_successfully');

// ❌ NUNCA criar constantes em inglês para traduzir
const MESSAGES = {
  success: 'Success',
  error: 'Error'
};

// ❌ NUNCA preparar para multi-idioma
interface Message {
  pt: string;
  en: string;
  es: string;
}
```

---

## 📚 **REFERÊNCIAS:**

- **Configuração pt-BR:** Ver `REMOCAO_I18N_GIFTS_STORE.md`
- **Utilitários de data:** Ver `src/lib/date-utils.ts`
- **Análise completa:** Ver `ANALISE_EXAUSTIVA_GIFTS_STORE.md`

---

## ✅ **RESUMO EXECUTIVO:**

| Item | Status |
|------|--------|
| **i18n instalado?** | ❌ Não |
| **i18n planejado?** | ❌ Não |
| **i18n permitido?** | ❌ **NUNCA** |
| **Idioma do sistema** | 🇧🇷 pt-BR APENAS |
| **Expansão internacional** | ❌ Não prevista |
| **Locale configurado?** | ⚠️ Pendente (em andamento) |

---

**ÚLTIMA ATUALIZAÇÃO:** 26/12/2025  
**RESPONSÁVEL:** Pink e Cerébro  
**STATUS:** 🔴 POLÍTICA ATIVA E DEFINITIVA
