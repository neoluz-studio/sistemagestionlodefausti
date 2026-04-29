import { CashSessionStatus, SaleStatus, UserRole } from './enums';

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  isActive: boolean;
}

export interface Store extends BaseEntity {
  tenantId: UUID;
  name: string;
  code: string;
  isActive: boolean;
}

export interface User extends BaseEntity {
  tenantId: UUID;
  storeId: UUID | null;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface CashSession extends BaseEntity {
  storeId: UUID;
  userId: UUID;
  status: CashSessionStatus;
}

export interface Sale extends BaseEntity {
  tenantId: UUID;
  storeId: UUID;
  userId: UUID;
  status: SaleStatus;
  total: number;
}
