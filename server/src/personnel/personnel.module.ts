import { Module } from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';
import { PrismaService } from '../prisma.service';
import { PersonnelContractController } from './personnelContracts/personnel-contract.controller';
import { PersonnelContractService } from './personnelContracts/personnel-contract.service';

@Module({
  controllers: [PersonnelController,PersonnelContractController],
  providers: [PersonnelService, PersonnelContractService, PrismaService],
})
export class PersonnelModule {}