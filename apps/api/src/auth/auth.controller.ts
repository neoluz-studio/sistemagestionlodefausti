import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from './types/auth-user.type';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Login por email o username + password' })
  @ApiOkResponse({ description: 'Tokens y contexto del usuario/local' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Rotar refresh token y emitir nuevo par de tokens' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revocar refresh token' })
  logout(@Body() dto: LogoutDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.authService.logout(dto, user, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener datos de usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contrasena del usuario autenticado' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.changePassword(user, dto, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }
}