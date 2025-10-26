import { IsDateString, IsString, IsOptional } from 'class-validator';

export class UpdatePersonnelContractDto {
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}