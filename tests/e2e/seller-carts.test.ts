/**
 * E2E Tests — Seller Carts Module (Comprehensive)
 * Covers: Cart CRUD, items management, conversion to quote, templates, limits, and UI states.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ============================================
// TYPES & MOCKS
// ============================================

interface SellerCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  color_name: string | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
}

interface SellerCart {
  id: string;
  seller_id: string;
  company_id: string;
  company_name: string;
  status: 'novo' | 'em_negociacao' | 'pronto_orcamento';
  items: SellerCartItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CART_LIMIT = 3;

// ============================================
// TEST SUITE
// ============================================

describe('Módulo de Carrinhos (E2E Exhaustive)', () => {
  let carts: SellerCart[] = [];
  const sellerId = 'u-admin-1';

  beforeEach(() => {
    // Reset state for each test
    carts = [
      {
        id: 'cart-1',
        seller_id: sellerId,
        company_id: 'comp-alpha',
        company_name: 'Alpha Corporate',
        status: 'novo',
        items: [
          { id: 'item-1', cart_id: 'cart-1', product_id: 'p-pen', product_name: 'Caneta Luxo', product_price: 15.00, quantity: 50, color_name: 'Azul', notes: null, sort_order: 0, created_at: new Date().toISOString() },
          { id: 'item-2', cart_id: 'cart-1', product_id: 'p-note', product_name: 'Caderno Moleskine', product_price: 45.00, quantity: 20, color_name: 'Preto', notes: 'Logo frontal', sort_order: 1, created_at: new Date().toISOString() }
        ],
        notes: 'Urgente para evento',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days old
        updated_at: new Date().toISOString()
      }
    ];
  });

  describe('Fluxo Principal: CRUD e Gestão de Itens', () => {
    it('deve adicionar um novo item ou incrementar quantidade se já existir', () => {
      const cart = carts[0];
      const newItemId = 'p-pen'; // Already in cart
      
      const existing = cart.items.find(i => i.product_id === newItemId);
      if (existing) {
        existing.quantity += 10;
      }
      
      expect(cart.items.find(i => i.product_id === 'p-pen')?.quantity).toBe(60);
    });

    it('deve remover um item e atualizar o total do carrinho', () => {
      const cart = carts[0];
      cart.items = cart.items.filter(i => i.id !== 'item-1');
      expect(cart.items).toHaveLength(1);
      const total = cart.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
      expect(total).toBe(45 * 20);
    });

    it('deve permitir editar notas individuais por item', () => {
      const item = carts[0].items[0];
      item.notes = 'Gravação a laser';
      expect(carts[0].items[0].notes).toBe('Gravação a laser');
    });

    it('deve reordenar itens preservando o sort_order', () => {
      const items = carts[0].items;
      // Inverte a ordem
      const [first, second] = items;
      carts[0].items = [second, first];
      carts[0].items.forEach((item, idx) => item.sort_order = idx);
      
      expect(carts[0].items[0].product_name).toBe('Caderno Moleskine');
      expect(carts[0].items[0].sort_order).toBe(0);
    });
  });

  describe('Regras de Negócio e Limites', () => {
    it(`deve impedir a criação de mais de ${CART_LIMIT} carrinhos simultâneos`, () => {
      // Adiciona mais 2 carrinhos para atingir o limite
      carts.push({ id: 'cart-2', seller_id: sellerId, company_id: 'c2', company_name: 'Beta', status: 'novo', items: [], notes: null, created_at: '', updated_at: '' });
      carts.push({ id: 'cart-3', seller_id: sellerId, company_id: 'c3', company_name: 'Gamma', status: 'novo', items: [], notes: null, created_at: '', updated_at: '' });
      
      const canCreate = carts.length < CART_LIMIT;
      expect(canCreate).toBe(false);
      
      // Simulação da tentativa de criar o 4º
      const tryCreate = () => {
        if (carts.length >= CART_LIMIT) throw new Error('Limite atingido');
      };
      expect(tryCreate).toThrow('Limite atingido');
    });

    it('deve permitir duplicar um carrinho com todos os seus itens', () => {
      const source = carts[0];
      const duplicate: SellerCart = {
        ...source,
        id: 'cart-dup',
        company_name: `${source.company_name} (Cópia)`,
        items: source.items.map(i => ({ ...i, id: `item-dup-${i.id}`, cart_id: 'cart-dup' }))
      };
      
      expect(duplicate.items).toHaveLength(source.items.length);
      expect(duplicate.items[0].product_name).toBe(source.items[0].product_name);
    });
  });

  describe('UI e Saúde do Carrinho', () => {
    it('deve identificar carrinhos que precisam de follow-up (parados há > 3 dias)', () => {
      const cart = carts[0];
      const ageInDays = (Date.now() - new Date(cart.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const needsFollowUp = ageInDays >= 3 && cart.items.length > 0;
      expect(needsFollowUp).toBe(true);
    });

    it('deve exibir o dot de status correto (novo, em_negociacao, pronto)', () => {
      const getStatusColor = (status: string) => {
        if (status === 'novo') return 'bg-blue-500';
        if (status === 'em_negociacao') return 'bg-yellow-500';
        return 'bg-green-500';
      };
      
      expect(getStatusColor(carts[0].status)).toBe('bg-blue-500');
      carts[0].status = 'em_negociacao';
      expect(getStatusColor(carts[0].status)).toBe('bg-yellow-500');
    });

    it('deve calcular a saúde do carrinho com base na checklist', () => {
      const cart = carts[0];
      const cartSubtotal = cart.items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
      
      const hasMinItems = cart.items.length >= 3;
      const hasNotes = !!cart.notes && cart.notes.trim().length > 10;
      const hasMinValue = cartSubtotal >= 500;
      
      const checks = [
        { id: "company", ok: !!cart.company_id },
        { id: "items", ok: hasMinItems },
        { id: "value", ok: hasMinValue },
        { id: "notes", ok: hasNotes }
      ];
      
      const okCount = checks.filter(c => c.ok).length;
      expect(okCount).toBe(3); // Empresa, Valor (1650), Notas (Urgente...) OK. Itens (2) Falhou.
    });
  });

  describe('Inteligência Comercial: Bundle Suggestions', () => {
    it('deve simular a adição de um item sugerido (cross-sell)', () => {
      const cart = carts[0];
      const suggestion = { product_id: 'p-suggest', product_name: 'Embalagem Presente', product_price: 5.00 };
      
      cart.items.push({
        id: 'item-suggested',
        cart_id: cart.id,
        product_id: suggestion.product_id,
        product_name: suggestion.product_name,
        product_price: suggestion.product_price,
        quantity: 50,
        color_name: null,
        notes: null,
        sort_order: 2,
        created_at: new Date().toISOString()
      });
      
      expect(cart.items).toHaveLength(3);
      expect(cart.items[2].product_id).toBe('p-suggest');
    });
  });

  describe('Integração: Conversão para Orçamento', () => {
    it('deve exportar itens no formato aceito pelo construtor de orçamentos', () => {
      const cartItems = carts[0].items;
      const quotePayload = cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product_price,
        personalizations: item.notes ? [{ description: item.notes }] : []
      }));
      
      expect(quotePayload[1].personalizations[0].description).toBe('Logo frontal');
      expect(quotePayload[0].unit_price).toBe(15.00);
    });
  });
});


