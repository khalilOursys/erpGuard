import { IsString, IsOptional, IsNumber, IsLongitude, IsLatitude } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  road?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  address: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  stateCode?: string;
}