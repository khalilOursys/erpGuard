import { PartialType } from '@nestjs/mapped-types';
import { CreateMissionDto } from './create-mission.dto';
import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMissionDto extends PartialType(CreateMissionDto) {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  extraPersonnelSlots?: number;
}
