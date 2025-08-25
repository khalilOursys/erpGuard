import { Module } from '@nestjs/common';
import { GuardService } from './guard.service';
import { GuardController } from './guard.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [GuardController],
  providers: [GuardService, PrismaService],
  exports: [GuardService],
})
export class GuardModule {}
