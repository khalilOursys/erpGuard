import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryServicesDto {
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

  @IsOptional()
  @IsString()
  @IsIn(['code', 'name', 'description', 'createdAt', 'updatedAt'])
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deletedOnly?: boolean = false;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inactiveOnly?: boolean = false;

  @IsOptional()
  @IsString()
  code?: string;
}