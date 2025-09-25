import { IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractServiceDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  serviceId!: number;

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
