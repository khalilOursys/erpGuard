// src/attendance/dto/update-attendance.dto.ts
import { IsDateString, IsEnum, IsOptional, IsNumber, IsObject } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  personnelId?: number;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsObject()
  addReplacement?: {
    personnelId: number;
    status: AttendanceStatus;
  };
}