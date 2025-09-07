import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyContactDto } from './create-company-contact.dto';

export class UpdateCompanyContactDto extends PartialType(CreateCompanyContactDto) {}
