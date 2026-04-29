import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen diario de dashboard' })
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getSummary(user);
  }

  @Get('weekly-sales')
  @ApiOperation({ summary: 'Ventas de los ultimos 7 dias agrupadas por dia' })
  weeklySales(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getWeeklySales(user);
  }

  @Get('recent-sales')
  @ApiOperation({ summary: 'Ultimas 10 ventas' })
  recentSales(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getRecentSales(user);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Productos con stock por debajo del minimo' })
  lowStock(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getLowStock(user);
  }
}