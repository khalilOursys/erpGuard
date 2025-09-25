import { IsOptional, IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSiteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  road?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsNotEmpty()
  @IsString()
  address!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  // cityId optional now
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cityId?: number;
}
