import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCashMovementDto {
  @ApiProperty({ example: '2500.00' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ example: 'Pago proveedor de hielo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}