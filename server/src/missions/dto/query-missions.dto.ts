import { IsOptional, IsInt, Min, Max, IsString, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMissionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  search?: string;

  // filter by siteId
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  siteId?: number;

  // date range
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @IsOptional()
  @IsDateString()
  startTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deletedOnly?: boolean = false;

  @IsOptional()
  @IsString()
  sortBy?: string = 'startDate';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}