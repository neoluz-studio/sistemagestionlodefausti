export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: 'ADMIN' | 'CAJA';
  tenantId: string;
  storeId: string | null;
};

export type StoreContext = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
} | null;

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'DEBIT' | 'CREDIT' | 'QR' | 'OTHER';

export type Product = {
  id: string;
  sku: string;
  name: string;
  stock: string;
  salePrice: string;
};

export type SaleItem = {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  product: Product;
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: string;
  reference: string | null;
};

export type Sale = {
  id: string;
  saleNumber: number;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELED' | 'REFUNDED';
  soldAt: string;
  total: string;
  items?: SaleItem[];
  payments: SalePayment[];
};

export type CashMovementType = 'OPENING' | 'INCOME' | 'EXPENSE' | 'WITHDRAWAL' | 'CLOSING';

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: string;
  description: string | null;
  createdAt: string;
  userId: string;
};

export type CashSessionStatus = 'OPEN' | 'CLOSED';

export type CashSession = {
  id: string;
  status: CashSessionStatus;
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  totalIncomes: string;
  totalExpenses: string;
  expectedAmount: string;
  difference: string | null;
  movements?: CashMovement[];
};

export type DashboardSummary = {
  salesCountToday: number;
  salesAmountToday: string;
  currentCashBalance: string | null;
  estimatedProfitToday: string;
  lowStockCount: number;
};

export type DashboardWeeklyPoint = {
  date: string;
  salesCount: number;
  totalAmount: string;
};

export type DashboardRecentSale = {
  id: string;
  saleNumber: number;
  total: string;
  paymentMethod: PaymentMethod;
  soldAt: string;
};

export type LowStockProduct = {
  id: string;
  sku: string;
  name: string;
  stock: string;
  minStock: string;
  salePrice: string;
};