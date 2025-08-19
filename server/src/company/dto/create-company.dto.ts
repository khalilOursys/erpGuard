// src/companies/dto/create-company.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactType } from '@prisma/client';

export class CompanyContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;
}

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyContactDto)
  contacts?: CompanyContactDto[];
}
