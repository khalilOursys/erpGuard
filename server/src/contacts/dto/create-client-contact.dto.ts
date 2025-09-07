import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ContactType } from '@prisma/client';

export class CreateClientContactDto {
  @IsNotEmpty()
  @IsEnum(ContactType)
  type: ContactType;

  @IsNotEmpty()
  @IsString()
  value: string;
}
