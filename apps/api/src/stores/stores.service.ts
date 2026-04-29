import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { UpdateCurrentStoreDto } from './dto/update-current-store.dto';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async current(user: AuthUser) {
    if (!user.storeId) {
      throw new NotFoundException('Usuario sin store asignado');
    }
    const store = await this.prisma.store.findFirst({
      where: { id: user.storeId, tenantId: user.tenantId },
    });
    if (!store) {
      throw new NotFoundException('Store no encontrado');
    }
    return store;
  }

  async updateCurrent(user: AuthUser, dto: UpdateCurrentStoreDto) {
    if (!user.storeId) {
      throw new NotFoundException('Usuario sin store asignado');
    }
    const store = await this.prisma.store.update({
      where: { id: user.storeId },
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
    await this.auditService.log({
      tenantId: user.tenantId,
      storeId: user.storeId,
      userId: user.sub,
      action: 'UPDATE_STORE',
      entity: 'STORE',
      entityId: store.id,
      metadata: dto as Prisma.InputJsonValue,
    });
    return store;
  }
}