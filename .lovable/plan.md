
# Foco-na-Técnica: novo comportamento do passo 2 → 3 do Orçamento

## Objetivo
Quando o vendedor selecionar uma técnica de gravação para um local, a lista das demais técnicas deve **sumir** e a UI deve avançar imediatamente para os campos de **tamanho/cores** daquela técnica. O vendedor mantém uma forma rápida e óbvia de **trocar a técnica** caso queira.

---

## Como ficaria a tela (3 estados do painel da localização)

### Estado A — Nenhuma técnica selecionada (igual hoje)
```text
TÉCNICAS PARA [PEITO ESQUERDO]                       [3 técnicas]
────────────────────────────────────────────────────
SILK
  ▢ Silk 1 cor
  ▢ Silk até 4 cores
TRANSFER
  ▢ Transfer digital
```

### Estado B — Técnica selecionada (NOVO)
A lista some. No topo aparece uma **barra compacta da técnica escolhida** com botão "Trocar". Abaixo, o painel de configuração (tamanho/cores) já visível, sem rolagem extra.
```text
TÉCNICA SELECIONADA                                   [Trocar ▾]
┌──────────────────────────────────────────────────┐
│ ● Silk até 4 cores   · SILK · até 4 cores        │
└──────────────────────────────────────────────────┘

CONFIGURAR TAMANHO
  Largura (cm) [____]    Altura (cm) [____]
  Nº de cores  [▾ 1 ]
  ──────────────────────────────────────────
  Preço unit.: R$ X,XX    Total local: R$ Y,YY
  [ Confirmar e adicionar ao orçamento ]
```

### Estado C — Vendedor clica "Trocar"
A lista de técnicas reaparece (mesmo visual do Estado A), com a técnica atual já marcada. Selecionar outra confirma a troca; selecionar a mesma fecha o "modo trocar" e volta ao Estado B sem alterar nada.

---

## Regras de comportamento

1. **Auto-colapso ao selecionar:** ao clicar em uma `TechniqueCard`, o `LocationPanel` esconde a lista e mostra a barra-resumo + `ConfigurationPanelV6` imediatamente. Sem cliques extras.
2. **Persistência de dimensões:** se o vendedor já tinha preenchido largura/altura/cores e troca de técnica, os valores são **mantidos** (pré-preenchidos na nova técnica) — só o preço é recalculado. Evita retrabalho.
3. **Troca confirmada:** clicar em "Trocar" abre a lista mas **não apaga** a técnica atual nem o preço já calculado. Só ao clicar em uma técnica diferente é que ocorre a substituição; um toast curto avisa "Técnica alterada: X → Y".
4. **Desmarcar é diferente de trocar:** clicar novamente na técnica atual dentro do modo trocar **fecha o seletor** e volta ao Estado B. Para remover de fato, usar o botão existente "Remover gravação" do resumo (sem mudança).
5. **Bloqueio Circular 360 x Lado A/B:** regra já existente continua válida — não é afetada por este redesign.
6. **Sticky do header de locais:** o bloco sticky (stepper + tabs de locais) permanece intacto. Apenas o conteúdo abaixo muda entre os 3 estados.
7. **Acessibilidade:** botão "Trocar" com `aria-expanded`, foco devolvido para a primeira `TechniqueCard` quando a lista reabre; barra-resumo com `role="status"`.

---

## Detalhes técnicos

Arquivo principal: `src/components/products/customization/LocationPanel.tsx`.

- Adicionar estado local `isPickerOpen: boolean` (default `false`).
  - `selectedTechnique = null` → forçar `isPickerOpen = true` (Estado A).
  - `selectedTechnique != null && !isPickerOpen` → Estado B.
  - `selectedTechnique != null && isPickerOpen` → Estado C.
- `handleSelectTechnique` passa a:
  - Se está no Estado A → setSelected + `setIsPickerOpen(false)`.
  - Se está no Estado C e clica a mesma → apenas `setIsPickerOpen(false)`.
  - Se está no Estado C e clica outra → `setSelected(novo)` + `setIsPickerOpen(false)` + toast "Técnica alterada".
- Novo subcomponente leve `SelectedTechniqueBar` (inline no mesmo arquivo) renderizando nome + grupo + botão "Trocar".
- Passar `initialWidth/Height/Colors` da técnica anterior para a nova via um `ref` em `LocationPanel` (`lastDimsRef`) para preservar dimensões na troca.
- Nenhuma mudança no schema, no hook `useQuoteBuilderState`, no `ProductCustomizationOptions.tsx` (apenas comportamento interno do `LocationPanel`) nem na persistência em `quote_item_personalizations`.
- Teste E2E novo: `e2e/quote-builder-technique-switch.spec.ts` — seleciona técnica, valida que demais somem, clica "Trocar", troca por outra, valida toast e que dimensões foram preservadas.

---

## Fora de escopo
- Nenhuma alteração visual no Stepper, no resumo do orçamento, no fluxo de salvar, na regra Circular/Lado A-B, nem no `ConfigurationPanelV6`.
- Sem mudanças de backend.

Posso seguir com a implementação assim que aprovar.
