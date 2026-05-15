# Checklist de QA Visual - Módulo Admin

Este checklist serve para garantir que todas as páginas do módulo Admin mantenham a consistência visual após a padronização do layout com o `MainLayout`.

## 1. Estrutura Base
- [ ] A página está envolvida pelo componente `<MainLayout>`.
- [ ] O componente `<PageSEO>` está presente e configurado corretamente (título, descrição, path).
- [ ] O conteúdo principal está dentro de uma `div` com a classe padronizada:
  `w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in`

## 2. Navegação (Sidebar)
- [ ] O sidebar fixo aparece no lado esquerdo em telas desktop (>= 1024px).
- [ ] O sidebar pode ser colapsado/expandido via botão de chevron.
- [ ] Em telas mobile (< 1024px), o sidebar fica oculto por padrão e abre como um overlay (drawer).
- [ ] O overlay do mobile possui backdrop blur e fecha ao clicar fora ou no botão "X".
- [ ] A navegação no mobile não sobrepõe o conteúdo de forma permanente (apenas quando aberta).

## 3. Espaçamento e Alinhamento
- [ ] O padding lateral é consistente entre todas as páginas (px-3 no mobile, escalando até px-8 em telas ultra-wide).
- [ ] O espaçamento vertical entre o Header e o primeiro elemento da página é consistente.
- [ ] Títulos de página (`<h1>`) seguem o padrão `font-display text-3xl font-bold` (ou similar padronizado).
- [ ] Ícones de cabeçalho (se houver) estão dentro de um container `bg-primary/10` arredondado.

## 4. Comportamento Responsivo
- [ ] Em telas pequenas, o conteúdo principal utiliza 100% da largura disponível (menos o padding).
- [ ] Tabelas possuem scroll horizontal em mobile para evitar quebra de layout.
- [ ] Gráficos e cards de resumo (stats) quebram de 4 colunas para 2 ou 1 conforme a largura da tela.

## 5. SEO e Meta-dados
- [ ] Inspecionar o `<head>` para garantir que não há tags `<title>` ou `<meta>` duplicadas.
- [ ] Confirmar que o `react-helmet-async` está sendo gerenciado apenas via `PageSEO`.
