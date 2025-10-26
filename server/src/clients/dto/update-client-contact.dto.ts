import { IsOptional, IsNumber, IsEnum, IsString } from 'class-validator';
import { ContactType } from '@prisma/client';  // Import from Prisma enums if generated, or define locally

export class UpdateClientContactDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @IsOptional()
  @IsString()
  value?: string;
}