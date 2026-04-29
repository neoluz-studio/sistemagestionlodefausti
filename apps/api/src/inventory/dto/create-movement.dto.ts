import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] })
  @IsEnum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN'])
  type!: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

  @ApiProperty({ example: '1.000' })
  @IsNumberString()
  quantity!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}