import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { ListCashSessionsDto } from './dto/list-cash-sessions.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { CashRegisterService } from './cash-register.service';

@ApiTags('Cash Register')
@ApiBearerAuth()
@Controller('api/v1')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Post('cash-sessions/open')
  @ApiOperation({ summary: 'Abrir caja diaria' })
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenCashSessionDto) {
    return this.cashRegisterService.open(user, dto);
  }

  @Get('cash-sessions/current')
  @ApiOperation({ summary: 'Obtener caja abierta actual con resumen' })
  current(@CurrentUser() user: AuthUser) {
    return this.cashRegisterService.current(user);
  }

  @Post('cash-sessions/:id/close')
  @ApiOperation({ summary: 'Cerrar caja con monto contado y conciliacion' })
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseCashSessionDto) {
    return this.cashRegisterService.close(user, id, dto);
  }

  @Get('cash-sessions')
  @ApiOperation({ summary: 'Historial de cajas con paginado' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListCashSessionsDto) {
    return this.cashRegisterService.list(user, query);
  }

  @Get('cash-sessions/:id')
  @ApiOperation({ summary: 'Detalle de caja con movimientos' })
  byId(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashRegisterService.getById(user, id);
  }

  @Post('cash-movements/income')
  @ApiOperation({ summary: 'Registrar ingreso manual de caja' })
  income(@CurrentUser() user: AuthUser, @Body() dto: CreateCashMovementDto) {
    return this.cashRegisterService.addIncome(user, dto);
  }

  @Post('cash-movements/expense')
  @ApiOperation({ summary: 'Registrar egreso manual de caja' })
  expense(@CurrentUser() user: AuthUser, @Body() dto: CreateCashMovementDto) {
    return this.cashRegisterService.addExpense(user, dto);
  }
}