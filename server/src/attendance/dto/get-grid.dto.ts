// src/attendance/dto/get-grid.dto.ts
import { IsDateString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class GetGridDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  contractIds?: number[];
}