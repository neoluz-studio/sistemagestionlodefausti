import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser) {
    return this.prisma.category.findMany({
      where: { tenantId: user.tenantId, storeId: user.storeId ?? undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(user: AuthUser, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        tenantId: user.tenantId,
        storeId: user.storeId!,
        name: dto.name,
        description: dto.description ?? null,
        isActive: true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCategoryDto) {
    const found = await this.prisma.category.findFirst({
      where: { id, tenantId: user.tenantId, storeId: user.storeId ?? undefined },
    });
    if (!found) {
      throw new NotFoundException('Categoria no encontrada');
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }
}