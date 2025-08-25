import { PartialType } from '@nestjs/mapped-types';
import { CreateClientContractDto } from './create-client-contract.dto';

export class UpdatClientContractDto extends PartialType(
  CreateClientContractDto,
) {}
