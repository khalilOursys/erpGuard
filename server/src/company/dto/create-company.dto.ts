import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  /**
   * ISO 4217 3-letter currency code (optional). If omitted,
   * system will use default (e.g., USD) when creating company.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Use a 3-letter ISO currency code (e.g. USD)' })
  baseCurrency?: string;
}
