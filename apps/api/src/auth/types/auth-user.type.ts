export type AuthUser = {
  sub: string;
  tenantId: string;
  storeId: string | null;
  role: 'ADMIN' | 'CAJA';
  email: string;
  fullName: string;
};