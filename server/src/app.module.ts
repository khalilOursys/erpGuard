import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CompanyModule } from './company/company.module';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { AppService } from './app.service';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PersonnelModule } from './personnel/personnel.module';
import { ClientModule } from './clients/client.module';
import { LocationsModule } from './locations/locations.module';
import { ContractModule } from './contracts/contract.module';
import { NotificationModule } from './notifications/notification.module';
import { MissionModule } from './missions/mission.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CompanyModule,
    ClientModule,
    LocationsModule,
    ContractModule,
    PersonnelModule,
    NotificationModule,
    MissionModule,
    AuditLogModule,
  ],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  controllers: [AppController],
})
export class AppModule {}
