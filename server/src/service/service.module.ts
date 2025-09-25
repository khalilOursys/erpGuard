import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { PrismaService } from 'src/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';

@Module({
  controllers: [ServiceController],
  providers: [ServiceService, PrismaService, AuditLogService],
  exports: [ServiceService],
})
export class ServiceModule {}
