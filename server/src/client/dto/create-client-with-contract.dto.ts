import { CreateClientContractDto } from './create-client-contract.dto';
import { CreateClientDto } from './create-client.dto';

export class CreateClientWithContractDto {
  client: CreateClientDto;
  contract: Omit<CreateClientContractDto, 'clientId'>;
}
