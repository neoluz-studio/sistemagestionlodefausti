import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: '0.00' })
  @IsNumberString()
  costPrice!: string;

  @ApiProperty({ example: '0.00' })
  @IsNumberString()
  salePrice!: string;

  @ApiProperty({ required: false, example: '0.000' })
  @IsOptional()
  @IsNumberString()
  minStock?: string;
}