import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { IdentifierType } from '@prisma/client';

export class UpdatePersonnelDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  identifier?: string;

  @IsEnum(IdentifierType)
  @IsOptional()
  identifierType?: IdentifierType;

  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsString()
  @IsOptional()
  uploadedById?: string;
}