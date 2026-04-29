import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from './types/auth-user.type';

const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private async signTokens(user: {
    id: string;
    tenantId: string;
    storeId: string | null;
    role: 'ADMIN' | 'CAJA';
    email: string;
    fullName: string;
  }) {
    const payload: AuthUser = {
      sub: user.id,
      tenantId: user.tenantId,
      storeId: user.storeId,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: ACCESS_TTL_SECONDS,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, tenantId: user.tenantId, type: 'refresh' },
      { expiresIn: REFRESH_TTL_SECONDS },
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private userPayload(user: {
    id: string;
    email: string;
    username: string | null;
    fullName: string;
    role: string;
    tenantId: string;
    storeId: string | null;
    store: { id: string; name: string; code: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
      store: user.store,
    };
  }

  async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
      include: { store: true },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const tokens = await this.signTokens({
      id: user.id,
      tenantId: user.tenantId,
      storeId: user.storeId,
      role: user.role as 'ADMIN' | 'CAJA',
      email: user.email,
      fullName: user.fullName,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.auditService.log({
      tenantId: user.tenantId,
      storeId: user.storeId,
      userId: user.id,
      action: 'LOGIN',
      entity: 'AUTH',
      metadata: { identifier: dto.identifier },
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.ua ?? null,
    });
    return { ...tokens, user: this.userPayload(user), store: user.store };
  }

  async refresh(dto: RefreshDto) {
    let decoded: { sub: string; tenantId: string; type?: string };
    try {
      decoded = await this.jwtService.verifyAsync(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }
    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token invalido');
    }
    const tokenRows = await this.prisma.refreshToken.findMany({
      where: { userId: decoded.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    let matchedId: string | null = null;
    for (const row of tokenRows) {
      const match = await argon2.verify(row.tokenHash, dto.refreshToken);
      if (match) {
        matchedId = row.id;
        break;
      }
    }
    if (!matchedId) {
      throw new UnauthorizedException('Refresh token revocado o inexistente');
    }
    await this.prisma.refreshToken.update({
      where: { id: matchedId },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findFirst({
      where: { id: decoded.sub, isActive: true },
      include: { store: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no disponible');
    }
    const tokens = await this.signTokens({
      id: user.id,
      tenantId: user.tenantId,
      storeId: user.storeId,
      role: user.role as 'ADMIN' | 'CAJA',
      email: user.email,
      fullName: user.fullName,
    });
    return { ...tokens, user: this.userPayload(user), store: user.store };
  }

  async logout(dto: LogoutDto, authUser: AuthUser, meta?: { ip?: string; ua?: string }) {
    const activeRows = await this.prisma.refreshToken.findMany({
      where: { userId: authUser.sub, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    for (const row of activeRows) {
      const match = await argon2.verify(row.tokenHash, dto.refreshToken).catch(() => false);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: row.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }
    await this.auditService.log({
      tenantId: authUser.tenantId,
      storeId: authUser.storeId,
      userId: authUser.sub,
      action: 'LOGOUT',
      entity: 'AUTH',
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.ua ?? null,
    });
    return { message: 'Logout ok' };
  }

  async me(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.sub },
      include: { store: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return { user: this.userPayload(user), store: user.store };
  }

  async changePassword(authUser: AuthUser, dto: ChangePasswordDto, meta?: { ip?: string; ua?: string }) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva password debe ser distinta');
    }
    const user = await this.prisma.user.findUnique({ where: { id: authUser.sub } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!ok) {
      throw new UnauthorizedException('Password actual invalida');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.auditService.log({
      tenantId: user.tenantId,
      storeId: user.storeId,
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'USER',
      entityId: user.id,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.ua ?? null,
    });
    return { message: 'Password actualizada' };
  }
}