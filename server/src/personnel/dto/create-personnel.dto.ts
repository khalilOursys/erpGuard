import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsDecimal,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonnelDto {
  @IsNumber()
  companyId: number;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: Date;

  @IsDecimal({ decimal_digits: '2' })
  @Type(() => String)
  baseSalary: number;

  @IsOptional()
  @IsNumber()
  serviceId?: number;
}
