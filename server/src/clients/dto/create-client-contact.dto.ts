import { IsEnum, IsString } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateClientContactDto {
  @IsEnum(ContactType)
  type: ContactType;

  @IsString()
  value: string;
}