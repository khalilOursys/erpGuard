import { AttendanceStatus, ReplacementType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';

// create-replacement-attendance.dto.ts
export class CreateReplacementAttendanceDto {
  @IsInt()
  assignmentId: number;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsInt()
  replacementForId?: number;

  @IsOptional()
  @IsInt()
  notedById?: number;

  @IsOptional()
  @IsInt()
  personnelId?: number;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;
}

/* // update-attendance.dto.ts
export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsInt()
  replacementForId?: number;

  @IsOptional()
  @IsEnum(ReplacementType)
  replacementType?: ReplacementType;

  @IsOptional()
  @IsInt()
  notedById?: number;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;
} */
