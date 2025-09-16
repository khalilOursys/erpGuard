import { Module } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [MissionsController],
  providers: [MissionsService, PrismaService],
  exports: [MissionsService],
})
export class MissionsModule {}
