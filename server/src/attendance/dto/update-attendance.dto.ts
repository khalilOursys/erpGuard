import { PartialType } from '@nestjs/mapped-types';
import { CreateAttendanceDto } from './create-attendance.dto';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAttendanceDto extends PartialType(CreateAttendanceDto) {}

export class BulkUpdateAttendanceItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  attendanceId!: number;

  @IsNotEmpty()
  data!: UpdateAttendanceDto;
}

export class BulkUpdateAttendanceDto {
  @IsNotEmpty()
  attendanceUpdates!: BulkUpdateAttendanceItemDto[];
}
