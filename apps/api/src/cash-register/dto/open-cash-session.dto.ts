import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class OpenCashSessionDto {
  @ApiProperty({ example: '15000.00' })
  @IsNumberString()
  openingAmount!: string;
}