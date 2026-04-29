import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list(current: AuthUser) {
    return this.prisma.user.findMany({
      where: { tenantId: current.tenantId },
      include: { store: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(current: AuthUser, dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        tenantId: current.tenantId,
        storeId: dto.storeId ?? current.storeId,
        email: dto.email,
        username: dto.username ?? null,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash: await argon2.hash(dto.password),
        isActive: true,
      },
      include: { store: true },
    });
    await this.auditService.log({
      tenantId: current.tenantId,
      storeId: current.storeId,
      userId: current.sub,
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });
    return user;
  }

  async getById(current: AuthUser, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: current.tenantId },
      include: { store: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async update(current: AuthUser, id: string, dto: UpdateUserDto) {
    await this.getById(current, id);
    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        username: dto.username,
        fullName: dto.fullName,
        role: dto.role,
        storeId: dto.storeId === undefined ? undefined : dto.storeId,
      },
      include: { store: true },
    });
  }

  async updateStatus(current: AuthUser, id: string, dto: UpdateUserStatusDto) {
    await this.getById(current, id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: { store: true },
    });
  }
}