// src/billings/dto/create-billing.dto.ts
import {
  IsString,
  IsInt,
  IsNumber,
  IsDateString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingStatus, BillingLineType, RateSource } from '@prisma/client';

export class CreateColumnConfigDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsBoolean()
  visible: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateBillingLineDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsEnum(BillingLineType)
  lineType: BillingLineType;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  missionId?: number;

  @IsOptional()
  @IsNumber()
  assignmentId?: number;

  @IsOptional()
  @IsNumber()
  missionServiceId?: number;

  @IsOptional()
  @IsNumber()
  personnelId?: number;

  @IsOptional()
  @IsNumber()
  serviceId?: number;

  @IsOptional()
  @IsNumber()
  contractId?: number;

  @IsNumber()
  personnelCount: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPriceBase: number;

  @IsNumber()
  lineTotalBase: number;

  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  discountAmountBase?: number;

  @IsNumber()
  totalAfterDiscountBase: number;

  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @IsOptional()
  @IsNumber()
  taxAmountBase?: number;

  @IsOptional()
  @IsNumber()
  unitPriceTarget?: number;

  @IsOptional()
  @IsNumber()
  lineTotalTarget?: number;

  @IsOptional()
  @IsNumber()
  discountAmountTarget?: number;

  @IsOptional()
  @IsNumber()
  totalAfterDiscountTarget?: number;

  @IsOptional()
  @IsNumber()
  taxAmountTarget?: number;
}

export class CreateBillingDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsNumber()
  companyId: number;

  @IsNumber()
  clientId: number;

  @IsOptional()
  @IsNumber()
  contractId?: number;

  @IsOptional()
  @IsNumber()
  generatedById?: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  amountBaseCurrency: number;

  @IsOptional()
  @IsString()
  targetCurrency?: string;

  @IsOptional()
  @IsNumber()
  conversionRate?: number;

  @IsOptional()
  @IsEnum(RateSource)
  rateSource?: RateSource;

  @IsOptional()
  @IsNumber()
  amountTargetCurrency?: number;

  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsOptional()
  @IsNumber()
  taxTotalBase?: number;

  @IsOptional()
  @IsNumber()
  taxTotalTarget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillingLineDto)
  lines: CreateBillingLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateColumnConfigDto)
  columnConfigs?: CreateColumnConfigDto[];
}
