import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsNumber()
  @IsOptional()
  defaultBasePay?: number;

  @IsNumber()
  @IsOptional()
  defaultExtraPay?: number;

  @IsNumber()
  @IsOptional()
  defaultClientPrice?: number;
  companyId: number | undefined;
}