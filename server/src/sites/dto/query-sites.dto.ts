import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySitesDto {
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
  @Type(() => Number)
  @IsInt()
  clientId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deletedOnly?: boolean = false;
}