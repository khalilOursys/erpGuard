import { IsNotEmpty, IsInt, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateSiteDto {
  @IsNotEmpty()
  @IsInt()
  clientId!: number;

  @IsNotEmpty()
  @IsString()
  name!: string;

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
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;
}