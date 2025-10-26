import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractSiteServiceDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  serviceId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredCount?: number = 1;

  @IsOptional()
  @Type(() => Number)
  basePay?: number;

  @IsOptional()
  @Type(() => Number)
  extraPay?: number;

  @IsOptional()
  @Type(() => Number)
  clientPrice?: number;
}