import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClientContractDto {
  @IsString()
  contractNumber: string;

  @IsNumber()
  clientId: number;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsNumber()
  basePay: number;

  @IsNumber()
  extraPay: number;

  @IsNumber()
  clientPrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  fileId?: number;

  @IsNumber()
  companyId: number;
}
