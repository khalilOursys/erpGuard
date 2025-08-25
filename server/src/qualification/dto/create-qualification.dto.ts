import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateQualificationDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
