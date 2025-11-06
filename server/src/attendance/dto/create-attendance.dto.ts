// src/attendance/dto/create-attendance.dto.ts
import {
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus, ReplacementType } from '@prisma/client';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  assignmentId!: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date!: Date;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkIn?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOut?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  replacementForId?: number;

  @IsOptional()
  @IsEnum(ReplacementType)
  replacementType?: ReplacementType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  notedById?: number;
}