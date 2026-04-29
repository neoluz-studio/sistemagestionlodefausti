import { ApiProperty } from '@nestjs/swagger';

export class WeeklySalesPointDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  salesCount!: number;

  @ApiProperty()
  totalAmount!: string;
}