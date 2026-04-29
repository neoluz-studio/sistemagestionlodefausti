import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashMovementType, CashSessionStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { ListCashSessionsDto } from './dto/list-cash-sessions.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

const INCOME_TYPES: CashMovementType[] = [CashMovementType.OPENING, CashMovementType.INCOME];
const EXPENSE_TYPES: CashMovementType[] = [CashMovementType.EXPENSE, CashMovementType.WITHDRAWAL, CashMovementType.CLOSING];

@Injectable()
export class CashRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private ensureStore(user: AuthUser) {
    if (!user.storeId) throw new BadRequestException('Usuario sin store asignado');
    return user.storeId;
  }

  async open(user: AuthUser, dto: OpenCashSessionDto) {
    const storeId = this.ensureStore(user);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.cashSession.findFirst({
        where: { tenantId: user.tenantId, storeId, status: CashSessionStatus.OPEN },
      });
      if (current) throw new BadRequestException('Ya existe una caja abierta en esta sucursal');

      const session = await tx.cashSession.create({
        data: {
          tenantId: user.tenantId,
          storeId,
          userId: user.sub,
          status: CashSessionStatus.OPEN,
          openingAmount: new Prisma.Decimal(dto.openingAmount),
        },
      });

      await tx.cashMovement.create({
        data: {
          tenantId: user.tenantId,
          storeId,
          cashSessionId: session.id,
          userId: user.sub,
          type: CashMovementType.OPENING,
          amount: new Prisma.Decimal(dto.openingAmount),
          description: 'Apertura de caja',
        },
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        storeId,
        userId: user.sub,
        action: 'CASH_SESSION_OPEN',
        entity: 'cash_session',
        entityId: session.id,
        metadata: { openingAmount: dto.openingAmount },
      });

      return this.getById(user, session.id);
    });
  }

  async current(user: AuthUser) {
    const storeId = this.ensureStore(user);
    const session = await this.prisma.cashSession.findFirst({
      where: { tenantId: user.tenantId, storeId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) return null;
    return this.getById(user, session.id);
  }

  async close(user: AuthUser, id: string, dto: CloseCashSessionDto) {
    const storeId = this.ensureStore(user);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { id, tenantId: user.tenantId, storeId },
      });
      if (!session) throw new NotFoundException('Caja no encontrada');
      if (session.status !== CashSessionStatus.OPEN) throw new BadRequestException('La caja ya esta cerrada');

      const movements = await tx.cashMovement.findMany({
        where: { tenantId: user.tenantId, storeId, cashSessionId: id },
      });
      const totals = this.computeTotals(session.openingAmount, movements);
      const countedAmount = new Prisma.Decimal(dto.countedAmount);
      const difference = countedAmount.sub(totals.expectedAmount);

      const closed = await tx.cashSession.update({
        where: { id: session.id },
        data: {
          status: CashSessionStatus.CLOSED,
          closedAt: new Date(),
          closingAmount: countedAmount,
        },
      });

      await tx.cashMovement.create({
        data: {
          tenantId: user.tenantId,
          storeId,
          cashSessionId: closed.id,
          userId: user.sub,
          type: CashMovementType.CLOSING,
          amount: countedAmount,
          description: `Cierre de caja. Esperado: ${totals.expectedAmount.toFixed(2)} - Diferencia: ${difference.toFixed(2)}`,
        },
      });

      await this.auditService.log({
        tenantId: user.tenantId,
        storeId,
        userId: user.sub,
        action: 'CASH_SESSION_CLOSE',
        entity: 'cash_session',
        entityId: closed.id,
        metadata: {
          expectedAmount: totals.expectedAmount.toFixed(2),
          countedAmount: dto.countedAmount,
          difference: difference.toFixed(2),
        },
      });

      return this.getById(user, closed.id);
    });
  }

  async list(user: AuthUser, query: ListCashSessionsDto) {
    const storeId = this.ensureStore(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { tenantId: user.tenantId, storeId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cashSession.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { movements: true, user: true },
      }),
      this.prisma.cashSession.count({ where }),
    ]);

    return {
      items: items.map((s) => this.mapSessionSummary(s)),
      page,
      limit,
      total,
    };
  }

  async getById(user: AuthUser, id: string) {
    const storeId = this.ensureStore(user);
    const session = await this.prisma.cashSession.findFirst({
      where: { id, tenantId: user.tenantId, storeId },
      include: {
        movements: { orderBy: { createdAt: 'asc' } },
        user: true,
      },
    });
    if (!session) throw new NotFoundException('Caja no encontrada');
    return this.mapSessionDetail(session);
  }

  async addIncome(user: AuthUser, dto: CreateCashMovementDto) {
    return this.addManualMovement(user, CashMovementType.INCOME, dto);
  }

  async addExpense(user: AuthUser, dto: CreateCashMovementDto) {
    return this.addManualMovement(user, CashMovementType.EXPENSE, dto);
  }

  private async addManualMovement(user: AuthUser, type: CashMovementType, dto: CreateCashMovementDto) {
    const storeId = this.ensureStore(user);
    const open = await this.prisma.cashSession.findFirst({
      where: { tenantId: user.tenantId, storeId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    if (!open) throw new BadRequestException('No hay caja abierta');

    const movement = await this.prisma.cashMovement.create({
      data: {
        tenantId: user.tenantId,
        storeId,
        cashSessionId: open.id,
        userId: user.sub,
        type,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description ?? null,
      },
    });

    return movement;
  }

  private computeTotals(openingAmount: Prisma.Decimal, movements: Array<{ type: CashMovementType; amount: Prisma.Decimal }>) {
    let totalIncomes = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);

    for (const movement of movements) {
      if (INCOME_TYPES.includes(movement.type)) totalIncomes = totalIncomes.plus(movement.amount);
      if (EXPENSE_TYPES.includes(movement.type)) totalExpenses = totalExpenses.plus(movement.amount);
    }

    const expectedAmount = openingAmount.plus(totalIncomes).minus(totalExpenses);
    return { totalIncomes, totalExpenses, expectedAmount };
  }

  private mapSessionSummary(session: {
    id: string;
    status: CashSessionStatus;
    openingAmount: Prisma.Decimal;
    closingAmount: Prisma.Decimal | null;
    openedAt: Date;
    closedAt: Date | null;
    movements: Array<{ type: CashMovementType; amount: Prisma.Decimal }>;
  }) {
    const totals = this.computeTotals(session.openingAmount, session.movements);
    const difference = session.closingAmount ? session.closingAmount.sub(totals.expectedAmount) : null;
    return {
      id: session.id,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingAmount: session.openingAmount.toFixed(2),
      closingAmount: session.closingAmount?.toFixed(2) ?? null,
      totalIncomes: totals.totalIncomes.toFixed(2),
      totalExpenses: totals.totalExpenses.toFixed(2),
      expectedAmount: totals.expectedAmount.toFixed(2),
      difference: difference?.toFixed(2) ?? null,
    };
  }

  private mapSessionDetail(session: {
    id: string;
    status: CashSessionStatus;
    openedAt: Date;
    closedAt: Date | null;
    openingAmount: Prisma.Decimal;
    closingAmount: Prisma.Decimal | null;
    user: { id: string; fullName: string };
    movements: Array<{
      id: string;
      type: CashMovementType;
      amount: Prisma.Decimal;
      description: string | null;
      createdAt: Date;
      userId: string;
    }>;
  }) {
    const totals = this.computeTotals(session.openingAmount, session.movements);
    const difference = session.closingAmount ? session.closingAmount.sub(totals.expectedAmount) : null;
    return {
      id: session.id,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingAmount: session.openingAmount.toFixed(2),
      closingAmount: session.closingAmount?.toFixed(2) ?? null,
      totalIncomes: totals.totalIncomes.toFixed(2),
      totalExpenses: totals.totalExpenses.toFixed(2),
      expectedAmount: totals.expectedAmount.toFixed(2),
      difference: difference?.toFixed(2) ?? null,
      user: { id: session.user.id, fullName: session.user.fullName },
      movements: session.movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: m.amount.toFixed(2),
        description: m.description,
        createdAt: m.createdAt,
        userId: m.userId,
      })),
    };
  }
}