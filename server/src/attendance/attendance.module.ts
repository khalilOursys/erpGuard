// src/attendance/attendance.module.ts - New module
import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [AttendanceService, PrismaService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}