import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsNotEmpty()
  @IsInt()
  companyId: number;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultBasePay?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultExtraPay?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultClientPrice?: number;
}
