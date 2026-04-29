import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty()
  salesCountToday!: number;

  @ApiProperty()
  salesAmountToday!: string;

  @ApiProperty({ nullable: true })
  currentCashBalance!: string | null;

  @ApiProperty()
  estimatedProfitToday!: string;

  @ApiProperty()
  lowStockCount!: number;
}