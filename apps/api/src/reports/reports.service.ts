import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriod, ReportsPeriodQueryDto } from './dto/reports-period-query.dto';

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
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureStore(user: AuthUser) {
    if (!user.storeId) throw new BadRequestException('Usuario sin store asignado');
    return user.storeId;
  }

  private resolveRange(query: ReportsPeriodQueryDto) {
    if (query.dateFrom && query.dateTo) {
      return { from: startOfDay(new Date(query.dateFrom)), to: endOfDay(new Date(query.dateTo)) };
    }
    const now = new Date();
    if (query.period === ReportPeriod.MONTH) {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    if (query.period === ReportPeriod.WEEK) {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  async salesSummary(user: AuthUser, query: ReportsPeriodQueryDto) {
    const storeId = this.ensureStore(user);
    const { from, to } = this.resolveRange(query);

    const [summary, rows] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where: { tenantId: user.tenantId, storeId, status: SaleStatus.COMPLETED, soldAt: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.$queryRaw<Array<{ period_label: string; sales_count: bigint; amount: Prisma.Decimal | null; profit: Prisma.Decimal | null }>>`
        SELECT TO_CHAR(DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at), 'YYYY-MM-DD') AS period_label,
               COUNT(*)::bigint AS sales_count,
               COALESCE(SUM(s.total), 0) AS amount,
               COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) AS profit
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products p ON p.id = si.product_id
        WHERE s.tenant_id = ${user.tenantId}::uuid
          AND s.store_id = ${storeId}::uuid
          AND s.status = 'COMPLETED'
          AND s.sold_at >= ${from}
          AND s.sold_at <= ${to}
        GROUP BY DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at)
        ORDER BY DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at) ASC
      `,
    ]);

    const totalProfit = rows.reduce((acc, r) => acc.plus(r.profit ?? new Prisma.Decimal(0)), new Prisma.Decimal(0));
    return {
      dateFrom: from,
      dateTo: to,
      totalSales: summary._count._all ?? 0,
      totalAmount: summary._sum.total?.toFixed(2) ?? '0.00',
      totalProfit: totalProfit.toFixed(2),
      periods: rows.map((r) => ({
        period: r.period_label,
        salesCount: Number(r.sales_count),
        amount: (r.amount ?? new Prisma.Decimal(0)).toFixed(2),
        profit: (r.profit ?? new Prisma.Decimal(0)).toFixed(2),
      })),
    };
  }

  async topProducts(user: AuthUser, query: ReportsPeriodQueryDto) {
    const storeId = this.ensureStore(user);
    const { from, to } = this.resolveRange(query);
    const rows = await this.prisma.$queryRaw<
      Array<{ product_id: string; sku: string; name: string; qty: Prisma.Decimal; amount: Prisma.Decimal }>
    >`
      SELECT p.id AS product_id,
             p.sku,
             p.name,
             COALESCE(SUM(si.quantity), 0) AS qty,
             COALESCE(SUM(si.subtotal), 0) AS amount
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.sale_id
      INNER JOIN products p ON p.id = si.product_id
      WHERE s.tenant_id = ${user.tenantId}::uuid
        AND s.store_id = ${storeId}::uuid
        AND s.status = 'COMPLETED'
        AND s.sold_at >= ${from}
        AND s.sold_at <= ${to}
      GROUP BY p.id, p.sku, p.name
      ORDER BY qty DESC, amount DESC
      LIMIT 20
    `;
    return rows.map((r, idx) => ({
      rank: idx + 1,
      productId: r.product_id,
      sku: r.sku,
      name: r.name,
      quantitySold: r.qty.toFixed(3),
      amount: r.amount.toFixed(2),
    }));
  }

  async profitSummary(user: AuthUser, query: ReportsPeriodQueryDto) {
    const storeId = this.ensureStore(user);
    const { from, to } = this.resolveRange(query);
    const rows = await this.prisma.$queryRaw<Array<{ period_label: string; revenue: Prisma.Decimal; cost: Prisma.Decimal; profit: Prisma.Decimal }>>`
      SELECT TO_CHAR(DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at), 'YYYY-MM-DD') AS period_label,
             COALESCE(SUM(si.subtotal), 0) AS revenue,
             COALESCE(SUM(p.cost_price * si.quantity), 0) AS cost,
             COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) AS profit
      FROM sales s
      INNER JOIN sale_items si ON si.sale_id = s.id
      INNER JOIN products p ON p.id = si.product_id
      WHERE s.tenant_id = ${user.tenantId}::uuid
        AND s.store_id = ${storeId}::uuid
        AND s.status = 'COMPLETED'
        AND s.sold_at >= ${from}
        AND s.sold_at <= ${to}
      GROUP BY DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at)
      ORDER BY DATE_TRUNC(${query.period === ReportPeriod.MONTH ? 'month' : query.period === ReportPeriod.WEEK ? 'week' : 'day'}, s.sold_at) ASC
    `;
    const totals = rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue.plus(r.revenue),
        cost: acc.cost.plus(r.cost),
        profit: acc.profit.plus(r.profit),
      }),
      { revenue: new Prisma.Decimal(0), cost: new Prisma.Decimal(0), profit: new Prisma.Decimal(0) },
    );
    return {
      dateFrom: from,
      dateTo: to,
      totalRevenue: totals.revenue.toFixed(2),
      totalCost: totals.cost.toFixed(2),
      totalProfit: totals.profit.toFixed(2),
      periods: rows.map((r) => ({
        period: r.period_label,
        revenue: r.revenue.toFixed(2),
        cost: r.cost.toFixed(2),
        profit: r.profit.toFixed(2),
      })),
    };
  }

  async cashHistory(user: AuthUser, query: ReportsPeriodQueryDto) {
    const storeId = this.ensureStore(user);
    const { from, to } = this.resolveRange(query);
    const rows = await this.prisma.cashSession.findMany({
      where: { tenantId: user.tenantId, storeId, openedAt: { gte: from, lte: to } },
      include: { movements: true },
      orderBy: { openedAt: 'desc' },
    });
    return rows.map((s) => {
      const incomes = s.movements
        .filter((m) => m.type === 'OPENING' || m.type === 'INCOME')
        .reduce((acc, m) => acc.plus(m.amount), new Prisma.Decimal(0));
      const expenses = s.movements
        .filter((m) => m.type === 'EXPENSE' || m.type === 'WITHDRAWAL' || m.type === 'CLOSING')
        .reduce((acc, m) => acc.plus(m.amount), new Prisma.Decimal(0));
      const expected = incomes.minus(expenses);
      const difference = s.closingAmount ? s.closingAmount.sub(expected) : null;
      return {
        id: s.id,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingAmount: s.openingAmount.toFixed(2),
        closingAmount: s.closingAmount?.toFixed(2) ?? null,
        expectedAmount: expected.toFixed(2),
        difference: difference?.toFixed(2) ?? null,
      };
    });
  }

  async frequentCustomers(user: AuthUser, query: ReportsPeriodQueryDto) {
    const storeId = this.ensureStore(user);
    const { from, to } = this.resolveRange(query);
    const rows = await this.prisma.$queryRaw<
      Array<{ customer_id: string; full_name: string; purchases: bigint; total_amount: Prisma.Decimal }>
    >`
      SELECT c.id AS customer_id,
             c.full_name,
             COUNT(s.id)::bigint AS purchases,
             COALESCE(SUM(s.total), 0) AS total_amount
      FROM sales s
      INNER JOIN customers c ON c.id = s.customer_id
      WHERE s.tenant_id = ${user.tenantId}::uuid
        AND s.store_id = ${storeId}::uuid
        AND s.status = 'COMPLETED'
        AND s.sold_at >= ${from}
        AND s.sold_at <= ${to}
      GROUP BY c.id, c.full_name
      ORDER BY purchases DESC, total_amount DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      customerId: r.customer_id,
      fullName: r.full_name,
      purchases: Number(r.purchases),
      totalAmount: r.total_amount.toFixed(2),
    }));
  }
}