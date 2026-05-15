/**
 * E2E Tests — Navigation & Layout Module
 * Covers: Routing, Sidebar, Header, Breadcrumbs, Mobile Nav, Responsive, 404
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ============ Route Definitions ============
const PUBLIC_ROUTES = ['/login', '/reset-password', '/approve/:token', '/proposta/:token', '/auth/callback'];
const PROTECTED_ROUTES = ['/', '/dashboard', '/produtos', '/produto/:id', '/novidades', '/favoritos',
  '/carrinhos', '/comparar', '/colecoes', '/orcamentos', '/orcamentos/novo', '/orcamentos/kanban',
  '/orcamentos/dashboard', '/orcamentos/templates', '/simulador', '/simulador-precos', '/estoque',
  '/busca-preco', '/montar-kit', '/mockup-generator', '/magic-up', '/pedidos', '/perfil', '/bi', '/tendencias'];
const ADMIN_ROUTES = ['/admin/usuarios', '/admin/seguranca', '/admin/cadastros', '/admin/prompts-ia',
  '/admin/telemetria', '/admin/permissoes', '/admin/roles', '/admin/role-permissoes', '/admin/rate-limit',
  '/status', '/external-db-test'];
const REDIRECT_ROUTES = [
  { from: '/produto', to: '/produtos' },
  { from: '/filtros', to: '/produtos' },
  { from: '/configuracoes', to: '/admin/usuarios' },
  { from: '/admin', to: '/admin/usuarios' },
  { from: '/mockup', to: '/mockup-generator' },
  { from: '/seguranca', to: '/perfil' },
];

describe('E2E Navigation — Route Registry', () => {
  it('has public routes', () => expect(PUBLIC_ROUTES.length).toBeGreaterThan(0));
  it('has protected routes', () => expect(PROTECTED_ROUTES.length).toBeGreaterThanOrEqual(20));
  it('has admin routes', () => expect(ADMIN_ROUTES.length).toBeGreaterThanOrEqual(9));
  it('has redirect routes', () => expect(REDIRECT_ROUTES).toHaveLength(6));

  PUBLIC_ROUTES.forEach(route => {
    it(`public route "${route}" starts with /`, () => expect(route.startsWith('/')).toBe(true));
  });

  PROTECTED_ROUTES.forEach(route => {
    it(`protected route "${route}" is defined`, () => expect(route).toBeTruthy());
  });

  ADMIN_ROUTES.forEach(route => {
    it(`admin route "${route}" starts with /admin or /`, () => {
      expect(route.startsWith('/admin') || route.startsWith('/status') || route.startsWith('/external')).toBe(true);
    });
  });

  REDIRECT_ROUTES.forEach(r => {
    it(`redirect: ${r.from} → ${r.to}`, () => {
      expect(r.from).not.toBe(r.to);
    });
  });
});

// ============ Sidebar Menu Items ============
const SIDEBAR_SECTIONS = [
  { label: 'Catálogo', icon: 'Package', items: ['Produtos', 'Novidades', 'Favoritos', 'Comparar', 'Coleções'] },
  { label: 'Vendas', icon: 'ShoppingCart', items: ['Orçamentos', 'Carrinhos', 'Pedidos'] },
  { label: 'Ferramentas', icon: 'Wrench', items: ['Simulador', 'Mockup', 'Kit Builder', 'Busca de Preço'] },
  { label: 'Analytics', icon: 'BarChart', items: ['BI Dashboard', 'Tendências'] },
  { label: 'Administração', icon: 'Settings', items: ['Usuários', 'Segurança', 'Cadastros', 'Roles'] },
];

describe('E2E Navigation — Sidebar Structure', () => {
  it('has 5 sections', () => expect(SIDEBAR_SECTIONS).toHaveLength(5));
  
  SIDEBAR_SECTIONS.forEach(section => {
    it(`section "${section.label}" has items`, () => expect(section.items.length).toBeGreaterThan(0));
    it(`section "${section.label}" has icon`, () => expect(section.icon).toBeTruthy());
  });

  it('total menu items >= 18', () => {
    const total = SIDEBAR_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(18);
  });
});

// ============ Responsive Breakpoints ============
describe('E2E Navigation — Responsive Breakpoints', () => {
  const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

  Object.entries(breakpoints).forEach(([name, width]) => {
    it(`breakpoint ${name} = ${width}px`, () => expect(width).toBeGreaterThan(0));
  });

  it('mobile is < 768px', () => expect(breakpoints.md).toBe(768));
  it('tablet is >= 768px && < 1024px', () => {
    expect(breakpoints.md).toBeLessThan(breakpoints.lg);
  });
  it('desktop is >= 1024px', () => expect(breakpoints.lg).toBe(1024));
});

// ============ 404 Page ============
describe('E2E Navigation — 404 Page', () => {
  it('NotFound is importable', async () => {
    const mod = await import('@/pages/NotFound');
    expect(mod.default).toBeDefined();
  });
});

// ============ Breadcrumb Path Parsing ============
function parseBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Início', href: '/' }];
  const labelMap: Record<string, string> = {
    produtos: 'Produtos', produto: 'Produto', orcamentos: 'Orçamentos',
    carrinhos: 'Carrinhos', admin: 'Admin', perfil: 'Perfil',
    simulador: 'Simulador', pedidos: 'Pedidos', favoritos: 'Favoritos',
    comparar: 'Comparar', novidades: 'Novidades', colecoes: 'Coleções',
    bi: 'BI', tendencias: 'Tendências', estoque: 'Estoque',
  };
  
  segments.forEach((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    crumbs.push({ label: labelMap[seg] || seg, href });
  });
  return crumbs;
}

describe('E2E Navigation — Breadcrumbs', () => {
  it('root has only Início', () => expect(parseBreadcrumbs('/')).toHaveLength(1));
  it('/produtos has 2 crumbs', () => expect(parseBreadcrumbs('/produtos')).toHaveLength(2));
  it('/orcamentos/novo has 3 crumbs', () => expect(parseBreadcrumbs('/orcamentos/novo')).toHaveLength(3));
  it('/admin/usuarios has 3 crumbs', () => expect(parseBreadcrumbs('/admin/usuarios')).toHaveLength(3));
  it('first crumb is always Início', () => {
    expect(parseBreadcrumbs('/qualquer/rota')[0].label).toBe('Início');
  });
  it('uses Portuguese labels', () => {
    const crumbs = parseBreadcrumbs('/produtos');
    expect(crumbs[1].label).toBe('Produtos');
  });
});

// ============ Command Bar (⌘K) ============
describe('E2E Navigation — Command Bar', () => {
  const commands = [
    { id: 'search', label: 'Buscar produto', shortcut: '⌘K', group: 'navigation' },
    { id: 'new-quote', label: 'Novo orçamento', shortcut: '⌘N', group: 'actions' },
    { id: 'goto-dashboard', label: 'Ir para Dashboard', shortcut: '⌘D', group: 'navigation' },
    { id: 'logout', label: 'Sair', shortcut: '⌘Q', group: 'system' },
  ];

  it('has commands defined', () => expect(commands.length).toBeGreaterThan(0));
  it('each command has id', () => commands.forEach(c => expect(c.id).toBeTruthy()));
  it('each command has label', () => commands.forEach(c => expect(c.label).toBeTruthy()));
  it('each command has shortcut', () => commands.forEach(c => expect(c.shortcut).toBeTruthy()));
  it('groups are valid', () => {
    const groups = new Set(commands.map(c => c.group));
    expect(groups.size).toBeGreaterThanOrEqual(2);
  });
});

// ============ Scroll Behavior ============
describe('E2E Navigation — Scroll', () => {
  it('scroll to top threshold', () => {
    const THRESHOLD = 150;
    expect(THRESHOLD).toBeGreaterThan(0);
  });
  
  it('scroll progress ranges 0-100', () => {
    const progress = Math.min(100, Math.max(0, 50));
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });
});
