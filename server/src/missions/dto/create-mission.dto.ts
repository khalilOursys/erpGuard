import { IsNotEmpty, IsInt, IsDateString, IsOptional, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMissionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  contractId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  siteId?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requiredPersonnel?: number;

  @IsOptional()
  @IsString()
  post?: string;

  // manager can be set now or left to default behavior
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number;
}
