import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { GuardType } from '@prisma/client';

export class UpdateGuardDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(GuardType)
  type?: GuardType;

  @IsOptional()
  @IsNumber()
  baseSalary?: number;
}
