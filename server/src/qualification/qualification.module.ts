import { Module } from '@nestjs/common';
import { QualificationService } from './qualification.service';
import { QualificationController } from './qualification.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [QualificationController],
  providers: [QualificationService, PrismaService],
  exports: [QualificationService],
})
export class QualificationModule {}
