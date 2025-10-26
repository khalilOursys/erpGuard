import { IsNotEmpty, IsInt, IsString, IsOptional, IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContractServiceDto } from './create-contract-service.dto';
import { CreateContractSiteDto } from './create-contract-site.dto';

export class CreateContractDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  clientId!: number;

  // optional contract number (server will generate if not provided)
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractServiceDto)
  serviceRates?: CreateContractServiceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContractSiteDto)
  sites?: CreateContractSiteDto[];
}