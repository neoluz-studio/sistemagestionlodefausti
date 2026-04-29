import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashMovementType, CashSessionStatus, PaymentMethod, Prisma, SaleStatus } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';

const CASH_METHODS: PaymentMethod[] = [PaymentMethod.CASH];

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(user: AuthUser, dto: CreateSaleDto) {
    const storeId = user.storeId;
    if (!storeId) {
      throw new BadRequestException('Usuario sin store asignado');
    }

    return this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { tenantId: user.tenantId, storeId, id: { in: productIds } },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('Uno o mas productos no existen');
      }

      const byId = new Map(products.map((p) => [p.id, p]));
      let subtotal = new Prisma.Decimal(0);
      let estimatedProfit = new Prisma.Decimal(0);
      const mappedItems = dto.items.map((item) => {
        const product = byId.get(item.productId)!;
        const qty = new Prisma.Decimal(item.quantity);
        if (qty.lte(0)) throw new BadRequestException('Cantidad invalida');
        if (product.stock.lt(qty)) throw new BadRequestException(`Stock insuficiente para ${product.name}`);
        const lineSubtotal = product.salePrice.mul(qty);
        subtotal = subtotal.plus(lineSubtotal);
        estimatedProfit = estimatedProfit.plus(product.salePrice.sub(product.costPrice).mul(qty));
        return { item, product, qty, lineSubtotal };
      });

      const total = subtotal;
      const paymentsTotal = dto.payments.reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));
      if (!paymentsTotal.equals(total)) {
        throw new BadRequestException('La suma de pagos debe ser igual al total');
      }

      const hasCashPayment = dto.payments.some((p) => CASH_METHODS.includes(p.method));
      const openCashSession = await tx.cashSession.findFirst({
        where: { tenantId: user.tenantId, storeId, status: CashSessionStatus.OPEN },
        orderBy: { openedAt: 'desc' },
      });
      const allowSalesWithoutOpenCashSession = this.configService.get<string>('ALLOW_SALES_WITHOUT_OPEN_CASH_SESSION') === 'true';
      if (hasCashPayment && !openCashSession && !allowSalesWithoutOpenCashSession) {
        throw new BadRequestException('No hay caja abierta para registrar movimiento de caja');
      }

      const lastSale = await tx.sale.findFirst({
        where: { tenantId: user.tenantId, storeId },
        orderBy: { saleNumber: 'desc' },
        select: { saleNumber: true },
      });
      const nextSaleNumber = (lastSale?.saleNumber ?? 0) + 1;

      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          storeId,
          saleNumber: nextSaleNumber,
          customerId: dto.customerId ?? null,
          userId: user.sub,
          cashSessionId: openCashSession?.id ?? null,
          status: SaleStatus.COMPLETED,
          subtotal,
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          total,
          notes: dto.notes ?? null,
        },
      });

      for (const row of mappedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: row.product.id,
            quantity: row.qty,
            unitPrice: row.product.salePrice,
            subtotal: row.lineSubtotal,
          },
        });
        const previous = row.product.stock;
        const current = previous.sub(row.qty);
        await tx.product.update({ where: { id: row.product.id }, data: { stock: current } });
        await tx.inventoryMovement.create({
          data: {
            tenantId: user.tenantId,
            storeId,
            productId: row.product.id,
            userId: user.sub,
            type: 'SALE_OUTPUT',
            quantity: row.qty,
            previousStock: previous,
            currentStock: current,
            reason: `Venta #${sale.saleNumber}`,
          },
        });
        if (current.lt(row.product.minStock)) {
          const existingAlert = await tx.stockAlert.findFirst({
            where: { tenantId: user.tenantId, storeId, productId: row.product.id, isResolved: false },
            select: { id: true },
          });
          if (existingAlert) {
            await tx.stockAlert.update({
              where: { id: existingAlert.id },
              data: { threshold: row.product.minStock, isResolved: false, resolvedAt: null },
            });
          } else {
            await tx.stockAlert.create({
              data: {
                tenantId: user.tenantId,
                storeId,
                productId: row.product.id,
                threshold: row.product.minStock,
                isResolved: false,
                resolvedAt: null,
              },
            });
          }
        } else {
          await tx.stockAlert.updateMany({
            where: { tenantId: user.tenantId, storeId, productId: row.product.id, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          });
        }
      }

      for (const payment of dto.payments) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            method: payment.method,
            amount: new Prisma.Decimal(payment.amount),
            reference: payment.reference ?? null,
          },
        });
      }

      if (openCashSession) {
        const cashAmount = dto.payments
          .filter((p) => p.method === PaymentMethod.CASH)
          .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));
        if (cashAmount.gt(0)) {
          await tx.cashMovement.create({
            data: {
              tenantId: user.tenantId,
              storeId,
              cashSessionId: openCashSession.id,
              userId: user.sub,
              type: CashMovementType.INCOME,
              amount: cashAmount,
              description: `Ingreso por venta #${sale.saleNumber}`,
            },
          });
        }
      }

      const fullSale = await tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { items: { include: { product: true } }, payments: true, customer: true, store: true },
      });
      return { ...fullSale, estimatedProfit: estimatedProfit.toFixed(2) };
    });
  }

  async list(user: AuthUser, query: ListSalesDto) {
    const storeId = user.storeId;
    const where: Prisma.SaleWhereInput = {
      tenantId: user.tenantId,
      storeId: storeId ?? undefined,
      customerId: query.customerId ?? undefined,
      soldAt: {
        gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
        lte: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      payments: query.paymentMethod ? { some: { method: query.paymentMethod } } : undefined,
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: { payments: true, customer: true },
        orderBy: { soldAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { items, page, limit, total };
  }

  async detail(user: AuthUser, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId, storeId: user.storeId ?? undefined },
      include: { items: { include: { product: true } }, payments: true, customer: true, store: true, user: true },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async cancel(user: AuthUser, id: string) {
    const storeId = user.storeId;
    if (!storeId) throw new BadRequestException('Usuario sin store asignado');
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, tenantId: user.tenantId, storeId },
        include: { items: { include: { product: true } }, payments: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === SaleStatus.CANCELED) throw new BadRequestException('La venta ya esta cancelada');

      for (const item of sale.items) {
        const previous = item.product.stock;
        const current = previous.plus(item.quantity);
        await tx.product.update({ where: { id: item.productId }, data: { stock: current } });
        await tx.inventoryMovement.create({
          data: {
            tenantId: user.tenantId,
            storeId,
            productId: item.productId,
            userId: user.sub,
            type: 'SALE_CANCEL_RETURN',
            quantity: item.quantity,
            previousStock: previous,
            currentStock: current,
            reason: `Cancelacion venta #${sale.saleNumber}`,
          },
        });
      }

      const openCashSession = await tx.cashSession.findFirst({
        where: { tenantId: user.tenantId, storeId, status: CashSessionStatus.OPEN },
        orderBy: { openedAt: 'desc' },
      });
      const cashAmount = sale.payments
        .filter((p) => p.method === PaymentMethod.CASH)
        .reduce((acc, p) => acc.plus(p.amount), new Prisma.Decimal(0));
      if (cashAmount.gt(0)) {
        if (!openCashSession) throw new BadRequestException('No hay caja abierta para registrar cancelacion en caja');
        await tx.cashMovement.create({
          data: {
            tenantId: user.tenantId,
            storeId,
            cashSessionId: openCashSession.id,
            userId: user.sub,
            type: CashMovementType.EXPENSE,
            amount: cashAmount,
            description: `Egreso por cancelacion venta #${sale.saleNumber}`,
          },
        });
      }

      await tx.sale.update({ where: { id: sale.id }, data: { status: SaleStatus.CANCELED } });
      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { items: { include: { product: true } }, payments: true, customer: true, store: true },
      });
    });
  }

  async ticket(user: AuthUser, id: string) {
    const sale = await this.detail(user, id);
    const itemsRows = sale.items
      .map(
        (item) =>
          `<tr><td>${item.product.name}</td><td>${item.quantity}</td><td>$${item.unitPrice}</td><td>$${item.subtotal}</td></tr>`,
      )
      .join('');
    const paymentsRows = sale.payments
      .map((p) => `<li>${p.method}: $${p.amount}${p.reference ? ` (${p.reference})` : ''}</li>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket #${sale.saleNumber}</title></head><body style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:16px;"><h2 style="margin:0 0 8px;">${sale.store.name}</h2><p style="margin:0 0 12px;">Fecha: ${new Date(sale.soldAt).toLocaleString()}</p><p style="margin:0 0 12px;">Venta #${sale.saleNumber}</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th align="left">Producto</th><th align="right">Cant.</th><th align="right">P.Unit</th><th align="right">Subtotal</th></tr></thead><tbody>${itemsRows}</tbody></table><hr/><p><strong>Total: $${sale.total}</strong></p><ul>${paymentsRows}</ul><p style="margin-top:18px;">Gracias por su compra.</p></body></html>`;
    return { saleId: sale.id, saleNumber: sale.saleNumber, html };
  }
}
