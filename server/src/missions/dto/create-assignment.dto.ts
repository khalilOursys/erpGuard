import { IsNotEmpty, IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  personnelId!: number;

  @IsOptional()
  @IsString()
  post?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isReplacement?: boolean = false;
}
