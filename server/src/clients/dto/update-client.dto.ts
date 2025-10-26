// src/clients/dto/update-client.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateClientDto, CreateClientContactDto, CreateSiteDto } from './create-client.dto';
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertClientContactDto extends CreateClientContactDto {
  @IsOptional()
  id?: number;
}

export class UpsertSiteDto extends CreateSiteDto {
  @IsOptional()
  id?: number;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertClientContactDto)
  contacts?: UpsertClientContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSiteDto)
  sites?: UpsertSiteDto[];
}