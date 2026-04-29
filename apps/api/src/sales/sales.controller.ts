import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('api/v1/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear venta con items y pagos' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas con filtros y paginado' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListSalesDto) {
    return this.salesService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de venta' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.salesService.detail(user, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar venta, devolver stock y registrar caja' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.salesService.cancel(user, id);
  }

  @Get(':id/ticket')
  @ApiOperation({ summary: 'Generar ticket digital HTML' })
  ticket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.salesService.ticket(user, id);
  }
}
