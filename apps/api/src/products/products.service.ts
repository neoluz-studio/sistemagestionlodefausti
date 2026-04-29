import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, search?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        storeId: user.storeId ?? undefined,
        name: search
          ? {
              contains: search,
              mode: 'insensitive',
            }
          : undefined,
      },
      include: { category: true },
      orderBy: { name: 'asc' },
      take: search ? 20 : undefined,
    });
  }

  create(user: AuthUser, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        tenantId: user.tenantId,
        storeId: user.storeId!,
        categoryId: dto.categoryId ?? null,
        sku: dto.sku,
        name: dto.name,
        description: dto.description ?? null,
        unit: 'unit',
        costPrice: new Prisma.Decimal(dto.costPrice),
        salePrice: new Prisma.Decimal(dto.salePrice),
        stock: new Prisma.Decimal('0'),
        minStock: new Prisma.Decimal(dto.minStock ?? '0'),
        isActive: true,
      },
      include: { category: true },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateProductDto) {
    const found = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId, storeId: user.storeId ?? undefined },
    });
    if (!found) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        costPrice: dto.costPrice ? new Prisma.Decimal(dto.costPrice) : undefined,
        salePrice: dto.salePrice ? new Prisma.Decimal(dto.salePrice) : undefined,
        minStock: dto.minStock ? new Prisma.Decimal(dto.minStock) : undefined,
        isActive: dto.isActive,
      },
      include: { category: true },
    });
  }
}