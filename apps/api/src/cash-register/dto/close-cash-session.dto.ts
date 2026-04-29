import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class CloseCashSessionDto {
  @ApiProperty({ example: '18450.00' })
  @IsNumberString()
  countedAmount!: string;
}