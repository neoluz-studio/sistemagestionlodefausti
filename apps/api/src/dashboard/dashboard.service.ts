import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureStore(user: AuthUser) {
    if (!user.storeId) throw new BadRequestException('Usuario sin store asignado');
    return user.storeId;
  }

  async getSummary(user: AuthUser) {
    const storeId = this.ensureStore(user);
    const from = startOfDay();
    const to = endOfDay();

    const [salesAgg, profitRows, openCash, lowStockCount] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where: { tenantId: user.tenantId, storeId, status: SaleStatus.COMPLETED, soldAt: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.$queryRaw<Array<{ profit: Prisma.Decimal | null }>>`
        SELECT COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) AS profit
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        INNER JOIN products p ON p.id = si.product_id
        WHERE s.tenant_id = ${user.tenantId}::uuid
          AND s.store_id = ${storeId}::uuid
          AND s.status = 'COMPLETED'
          AND s.sold_at >= ${from}
          AND s.sold_at <= ${to}
      `,
      this.prisma.cashSession.findFirst({
        where: { tenantId: user.tenantId, storeId, status: 'OPEN' },
        include: { movements: true },
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM products p
        WHERE p.tenant_id = ${user.tenantId}::uuid
          AND p.store_id = ${storeId}::uuid
          AND p.stock < p.min_stock
      `,
    ]);

    let currentCashBalance: string | null = null;
    if (openCash) {
      const incomes = openCash.movements
        .filter((m) => m.type === 'OPENING' || m.type === 'INCOME')
        .reduce((acc, m) => acc.plus(m.amount), new Prisma.Decimal(0));
      const expenses = openCash.movements
        .filter((m) => m.type === 'EXPENSE' || m.type === 'WITHDRAWAL' || m.type === 'CLOSING')
        .reduce((acc, m) => acc.plus(m.amount), new Prisma.Decimal(0));
      currentCashBalance = incomes.minus(expenses).toFixed(2);
    }

    return {
      salesCountToday: salesAgg._count._all ?? 0,
      salesAmountToday: salesAgg._sum.total?.toFixed(2) ?? '0.00',
      currentCashBalance,
      estimatedProfitToday: (profitRows[0]?.profit ?? new Prisma.Decimal(0)).toFixed(2),
      lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    };
  }

  async getWeeklySales(user: AuthUser) {
    const storeId = this.ensureStore(user);
    const today = startOfDay();
    const from = new Date(today);
    from.setDate(from.getDate() - 6);

    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; sales_count: bigint; total_amount: Prisma.Decimal | null }>
    >`
      SELECT DATE_TRUNC('day', s.sold_at) AS day,
             COUNT(*)::bigint AS sales_count,
             COALESCE(SUM(s.total), 0) AS total_amount
      FROM sales s
      WHERE s.tenant_id = ${user.tenantId}::uuid
        AND s.store_id = ${storeId}::uuid
        AND s.status = 'COMPLETED'
        AND s.sold_at >= ${from}
      GROUP BY DATE_TRUNC('day', s.sold_at)
      ORDER BY DATE_TRUNC('day', s.sold_at) ASC
    `;

    const map = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r]));
    const result: Array<{ date: string; salesCount: number; totalAmount: string }> = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(from);
      date.setDate(from.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      const row = map.get(key);
      result.push({
        date: key,
        salesCount: Number(row?.sales_count ?? 0),
        totalAmount: (row?.total_amount ?? new Prisma.Decimal(0)).toFixed(2),
      });
    }
    return result;
  }

  async getRecentSales(user: AuthUser) {
    const storeId = this.ensureStore(user);
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, storeId, status: SaleStatus.COMPLETED },
      include: { payments: { orderBy: { paidAt: 'asc' }, take: 1 } },
      orderBy: { soldAt: 'desc' },
      take: 10,
    });

    return sales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      total: s.total.toFixed(2),
      paymentMethod: s.payments[0]?.method ?? 'OTHER',
      soldAt: s.soldAt,
    }));
  }

  async getLowStock(user: AuthUser) {
    const storeId = this.ensureStore(user);
    const products = await this.prisma.$queryRaw<
      Array<{
        id: string;
        sku: string;
        name: string;
        stock: Prisma.Decimal;
        min_stock: Prisma.Decimal;
        sale_price: Prisma.Decimal;
      }>
    >`
      SELECT p.id, p.sku, p.name, p.stock, p.min_stock, p.sale_price
      FROM products p
      WHERE p.tenant_id = ${user.tenantId}::uuid
        AND p.store_id = ${storeId}::uuid
        AND p.stock < p.min_stock
      ORDER BY p.stock ASC, p.name ASC
      LIMIT 50
    `;
    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock.toFixed(3),
      minStock: p.min_stock.toFixed(3),
      salePrice: p.sale_price.toFixed(2),
    }));
  }
}