import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, IsString, IsNumber as IsFloat, IsLatitude, IsLongitude } from 'class-validator';
import { CreateSiteDto } from './create-site.dto';

export class UpdateSiteDto extends PartialType(CreateSiteDto) {
    @IsOptional()
  @IsNumber()
  id?: number;

  // Explicitly make all fields optional (PartialType does this, but for clarity/validation)
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  road?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsFloat()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsFloat()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;
}