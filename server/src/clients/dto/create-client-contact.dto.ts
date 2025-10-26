// src/clients/dto/create-client-contact.dto.ts (if separate; otherwise use the one above)
import { IsString, IsEnum } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateClientContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;
}