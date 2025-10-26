import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class CreatePersonnelContractDto {
  @IsString()
  @IsNotEmpty()
  contractNumber: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}