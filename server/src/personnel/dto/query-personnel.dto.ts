import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPersonnelsDto {
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

  // free-text search across identifier, displayname, email
  @IsOptional()
  @IsString()
  search?: string;

  // sort field - limit allowed fields to avoid abuses
  @IsOptional()
  @IsString()
  @IsIn([
    'firstName',
    'lastName',
    'identifier',
    'email',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string = 'identifier';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  // deletedOnly = true => return only deleted users
  // deletedOnly = false or omitted => return only non-deleted users
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deletedOnly?: boolean = false;
}
