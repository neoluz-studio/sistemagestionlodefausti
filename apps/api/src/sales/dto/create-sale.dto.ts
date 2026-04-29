import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: '1.000' })
  @IsNumberString()
  quantity!: string;
}

export class CreateSalePaymentDto {
  @ApiProperty({ enum: [PaymentMethod.CASH, PaymentMethod.TRANSFER, PaymentMethod.DEBIT, PaymentMethod.CREDIT] })
  @IsEnum([PaymentMethod.CASH, PaymentMethod.TRANSFER, PaymentMethod.DEBIT, PaymentMethod.CREDIT])
  method!: PaymentMethod;

  @ApiProperty({ example: '1000.00' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class CreateSaleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @ApiProperty({ type: [CreateSalePaymentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments!: CreateSalePaymentDto[];
}
