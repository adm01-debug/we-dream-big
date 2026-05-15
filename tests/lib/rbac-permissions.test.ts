/**
 * Tests for the RBAC permission matrix logic.
 * We test the pure permission checking logic without the hook's React context dependency.
 */
import { describe, it, expect } from 'vitest';

type RoleName = 'admin' | 'manager' | 'seller' | 'viewer';

interface Permission {
  action: string;
  resource: string;
}

// Replicated from useRBAC.tsx for pure testing
const rolePermissions: Record<RoleName, Permission[]> = {
  admin: [{ action: '*', resource: '*' }],
  manager: [
    { action: 'read', resource: '*' },
    { action: 'create', resource: 'quotes' },
    { action: 'update', resource: 'quotes' },
    { action: 'delete', resource: 'quotes' },
    { action: 'approve', resource: 'quotes' },
    { action: 'create', resource: 'orders' },
    { action: 'update', resource: 'orders' },
    { action: 'read', resource: 'reports' },
    { action: 'manage', resource: 'team' },
    { action: 'create', resource: 'products' },
    { action: 'update', resource: 'products' },
    { action: 'delete', resource: 'products' },
    { action: 'import', resource: 'products' },
    { action: 'manage', resource: 'suppliers' },
    { action: 'manage', resource: 'categories' },
  ],
  seller: [
    { action: 'read', resource: 'products' },
    { action: 'read', resource: 'clients' },
    { action: 'create', resource: 'quotes' },
    { action: 'update', resource: 'quotes' },
    { action: 'read', resource: 'quotes' },
    { action: 'create', resource: 'orders' },
    { action: 'read', resource: 'orders' },
    { action: 'read', resource: 'mockups' },
    { action: 'create', resource: 'mockups' },
  ],
  viewer: [
    { action: 'read', resource: 'products' },
    { action: 'read', resource: 'quotes' },
    { action: 'read', resource: 'orders' },
  ],
};

function hasPermission(role: RoleName, action: string, resource: string): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.some(
    p => (p.action === '*' || p.action === action) && (p.resource === '*' || p.resource === resource)
  );
}

function getRoleName(roleStr: string): RoleName {
  if (roleStr === 'vendedor') return 'seller';
  if (['admin', 'manager', 'seller', 'viewer'].includes(roleStr)) return roleStr as RoleName;
  return 'seller';
}

describe('RBAC Permission Matrix', () => {
  describe('admin', () => {
    it('has access to everything', () => {
      expect(hasPermission('admin', 'delete', 'users')).toBe(true);
      expect(hasPermission('admin', 'read', 'products')).toBe(true);
      expect(hasPermission('admin', 'anything', 'anything')).toBe(true);
    });
  });

  describe('manager', () => {
    it('can read all resources', () => {
      expect(hasPermission('manager', 'read', 'products')).toBe(true);
      expect(hasPermission('manager', 'read', 'quotes')).toBe(true);
      expect(hasPermission('manager', 'read', 'anything')).toBe(true);
    });
    it('can CRUD quotes', () => {
      expect(hasPermission('manager', 'create', 'quotes')).toBe(true);
      expect(hasPermission('manager', 'update', 'quotes')).toBe(true);
      expect(hasPermission('manager', 'delete', 'quotes')).toBe(true);
      expect(hasPermission('manager', 'approve', 'quotes')).toBe(true);
    });
    it('can manage products', () => {
      expect(hasPermission('manager', 'create', 'products')).toBe(true);
      expect(hasPermission('manager', 'import', 'products')).toBe(true);
    });
    it('cannot delete users', () => {
      expect(hasPermission('manager', 'delete', 'users')).toBe(false);
    });
  });

  describe('seller', () => {
    it('can read products and create quotes', () => {
      expect(hasPermission('seller', 'read', 'products')).toBe(true);
      expect(hasPermission('seller', 'create', 'quotes')).toBe(true);
    });
    it('cannot delete quotes', () => {
      expect(hasPermission('seller', 'delete', 'quotes')).toBe(false);
    });
    it('cannot approve quotes', () => {
      expect(hasPermission('seller', 'approve', 'quotes')).toBe(false);
    });
    it('cannot manage products', () => {
      expect(hasPermission('seller', 'create', 'products')).toBe(false);
    });
  });

  describe('viewer', () => {
    it('can only read', () => {
      expect(hasPermission('viewer', 'read', 'products')).toBe(true);
      expect(hasPermission('viewer', 'read', 'quotes')).toBe(true);
      expect(hasPermission('viewer', 'read', 'orders')).toBe(true);
    });
    it('cannot create anything', () => {
      expect(hasPermission('viewer', 'create', 'quotes')).toBe(false);
      expect(hasPermission('viewer', 'update', 'products')).toBe(false);
    });
  });
});

describe('Role name mapping', () => {
  it('maps "vendedor" to "seller"', () => {
    expect(getRoleName('vendedor')).toBe('seller');
  });
  it('passes through valid role names', () => {
    expect(getRoleName('admin')).toBe('admin');
    expect(getRoleName('manager')).toBe('manager');
  });
  it('defaults unknown roles to "seller"', () => {
    expect(getRoleName('superuser')).toBe('seller');
    expect(getRoleName('')).toBe('seller');
  });
});
