import { IsNotEmpty, IsString, MinLength, IsOptional, IsArray, ArrayUnique, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  companyId: number;

  @IsNotEmpty()
  @IsString()
  identifier: string; // login id

  @IsOptional()
  @IsString()
  displayname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  permissions?: string[];
}
