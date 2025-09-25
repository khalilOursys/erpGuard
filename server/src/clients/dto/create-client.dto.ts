import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, ValidateNested, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType } from '@prisma/client';
import { CreateClientContactDto } from './create-client-contact.dto';
import { CreateSiteDto } from './create-site.dto';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEnum(ClientType)
  type!: ClientType;

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
  @ArrayUnique((o: CreateClientContactDto) => `${o.type}:${o.value}`)
  @Type(() => CreateClientContactDto)
  contacts?: CreateClientContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSiteDto)
  sites?: CreateSiteDto[];
}
