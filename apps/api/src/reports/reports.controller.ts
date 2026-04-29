import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsPeriodQueryDto } from './dto/reports-period-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  @ApiOperation({ summary: 'Resumen de ventas por periodo y rango' })
  salesSummary(@CurrentUser() user: AuthUser, @Query() query: ReportsPeriodQueryDto) {
    return this.reportsService.salesSummary(user, query);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Productos mas vendidos por rango de fechas' })
  topProducts(@CurrentUser() user: AuthUser, @Query() query: ReportsPeriodQueryDto) {
    return this.reportsService.topProducts(user, query);
  }

  @Get('profit-summary')
  @ApiOperation({ summary: 'Resumen de ganancias por periodo' })
  profitSummary(@CurrentUser() user: AuthUser, @Query() query: ReportsPeriodQueryDto) {
    return this.reportsService.profitSummary(user, query);
  }

  @Get('cash-history')
  @ApiOperation({ summary: 'Historial de cajas por dia' })
  cashHistory(@CurrentUser() user: AuthUser, @Query() query: ReportsPeriodQueryDto) {
    return this.reportsService.cashHistory(user, query);
  }

  @Get('frequent-customers')
  @ApiOperation({ summary: 'Clientes frecuentes por rango de fechas' })
  frequentCustomers(@CurrentUser() user: AuthUser, @Query() query: ReportsPeriodQueryDto) {
    return this.reportsService.frequentCustomers(user, query);
  }
}