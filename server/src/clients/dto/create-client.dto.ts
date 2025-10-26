// src/clients/dto/create-client.dto.ts (assuming this exists; if not, create it)
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, ContactType } from '@prisma/client'; // Adjust import path as needed

export class CreateClientContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;
}

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

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;
}

export class CreateClientDto {
  @IsString()
  name: string;

  @IsEnum(ClientType)
  type: ClientType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  tax_number?: string;

  @IsOptional()
  @IsString()
  rib?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClientContactDto)
  contacts?: CreateClientContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSiteDto)
  sites?: CreateSiteDto[];
}