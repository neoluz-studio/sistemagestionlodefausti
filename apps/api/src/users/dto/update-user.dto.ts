import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ enum: ['ADMIN', 'CAJA'], required: false })
  @IsOptional()
  @IsEnum(['ADMIN', 'CAJA'])
  role?: 'ADMIN' | 'CAJA';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storeId?: string | null;
}