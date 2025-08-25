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

export class CreateClientDto {
  @IsString()
  name: string;

  @IsEnum(ClientType)
  type: ClientType;

  address?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];

  @IsNumber()
  @IsNotEmpty()
  companyId: number;
}
