import { IsNotEmpty, IsInt, IsOptional, IsDateString, ValidateNested, ArrayUnique, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContractSiteServiceDto } from './create-contract-site-service.dto';

export class CreateContractSiteDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  siteId!: number;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateContractSiteServiceDto)
  services?: CreateContractSiteServiceDto[];
}