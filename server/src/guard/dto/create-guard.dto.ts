import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuardType } from '@prisma/client';

export class CreateGuardQualificationDto {
  @IsNumber()
  qualificationId: number;

  @IsOptional()
  @IsString()
  issuedAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class CreateGuardDto {
  @IsNumber()
  companyId: number;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(GuardType)
  type: GuardType;

  @IsNumber()
  baseSalary: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGuardQualificationDto)
  qualifications?: CreateGuardQualificationDto[];
}
