import { IsEnum, IsNotEmpty, IsString, MinLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  companyId: number;

  @IsNotEmpty()
  @IsString()
  identifier: string; // login id (unique)

  @IsString()
  displayname?: string;

  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
}
