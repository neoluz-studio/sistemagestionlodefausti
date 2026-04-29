import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  movements(user: AuthUser) {
    return this.prisma.inventoryMovement.findMany({
      where: { tenantId: user.tenantId, storeId: user.storeId ?? undefined },
      include: { product: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createMovement(user: AuthUser, dto: CreateMovementDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        tenantId: user.tenantId,
        storeId: user.storeId ?? undefined,
      },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    const quantity = new Prisma.Decimal(dto.quantity);
    if (quantity.lte(0)) {
      throw new BadRequestException('Cantidad invalida');
    }
    const previous = new Prisma.Decimal(product.stock.toString());
    let next = previous;
    if (dto.type === 'IN' || dto.type === 'RETURN') {
      next = previous.plus(quantity);
    } else if (dto.type === 'OUT') {
      next = previous.minus(quantity);
      if (next.lt(0)) {
        throw new BadRequestException('Stock insuficiente');
      }
    } else {
      next = quantity;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: { stock: next },
      });
      await tx.inventoryMovement.create({
        data: {
          tenantId: user.tenantId,
          storeId: user.storeId!,
          productId: product.id,
          userId: user.sub,
          type: dto.type,
          quantity,
          previousStock: previous,
          currentStock: next,
          reason: dto.reason ?? null,
        },
      });
      return updated;
    });
  }
}