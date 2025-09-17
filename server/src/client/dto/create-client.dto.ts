// src/client/dto/create-client.dto.ts
import { ClientType, ContactType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ClientContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;
}

export class ClientLocationDto {
  @IsString()
  address: string;

  @IsNumber()
  @IsNotEmpty()
  cityId: number;
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

  @IsString()
  rib?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientLocationDto)
  locations?: ClientLocationDto[];

  @IsNumber()
  @IsNotEmpty()
  companyId: number;
}
