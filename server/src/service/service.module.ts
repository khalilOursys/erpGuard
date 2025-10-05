import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Module({
  controllers: [ServiceController],
  providers: [ServiceService, PrismaService, AuditLogService],
  exports: [ServiceService], // If needed elsewhere
})
export class ServiceModule {}