export interface SupplierContact {
  id: string;
  role: string;
  name: string;
  signature: string;
  nickname: string;
  email: string;
  phone: string;
}

export interface PixKey {
  id: string;
  tipo: string;
  chave: string;
  favorecido: string;
  principal: boolean;
}

export interface NewSupplierDialogProps {
  onCreated: (id: string) => void;
}

export const CONTACT_ROLES = [
  'Proprietário',
  'Diretor',
  'Gerente',
  'Vendedor',
  'Financeiro',
  'Compras',
  'Logística',
  'Suporte',
  'Outro',
] as const;

export const ORGANIZATION_ID = '5db5aee1-064b-4ef4-9193-345dcd8274ea';

export const createEmptyContact = (): SupplierContact => ({
  id: crypto.randomUUID(),
  role: '',
  name: '',
  signature: '',
  nickname: '',
  email: '',
  phone: '',
});

export const createEmptyPixKey = (principal = false): PixKey => ({
  id: crypto.randomUUID(),
  tipo: '',
  chave: '',
  favorecido: '',
  principal,
});
