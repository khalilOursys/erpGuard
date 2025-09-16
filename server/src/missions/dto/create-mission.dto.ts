import {
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MissionServiceRequirementDto {
  @IsInt()
  @Min(1)
  serviceId: number;

  @IsInt()
  @Min(1)
  requiredCount: number;

  @IsNumber()
  @Min(0)
  basePay: number;

  @IsNumber()
  @Min(0)
  extraPay: number;

  @IsNumber()
  @Min(0)
  clientPrice: number;
}

export class CreateMissionDto {
  @IsInt()
  @Min(1)
  contractId: number;

  @IsInt()
  @IsNumber()
  locationId?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  requiredPersonnel: number; // Changed from requiredGuards to match your model

  @IsOptional()
  @IsInt()
  @Min(0)
  extraPersonnelSlots?: number; // Changed from extraGuardSlots to match your model

  @IsOptional()
  @IsInt()
  serviceChiefId?: number; // Changed from chiefGuardId to match your model

  @IsInt()
  managerId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MissionServiceRequirementDto)
  requirements?: MissionServiceRequirementDto[];

  @IsInt()
  companyId: number;
}
