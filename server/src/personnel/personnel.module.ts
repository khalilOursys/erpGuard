import { Module } from '@nestjs/common';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [PersonnelController],
  providers: [PersonnelService, PrismaService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
