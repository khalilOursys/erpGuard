import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { PrismaService } from 'src/prisma.service';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [ContractController],
  providers: [ContractService, PrismaService],
  exports: [ContractService],
})
export class ContractModule {}
