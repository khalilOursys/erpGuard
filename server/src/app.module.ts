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
import { AuditLogModule } from './audit-log/audit-log.module';
import { ServiceModule } from './service/service.module';
import { FilesModule } from './files/files.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SitesModule } from './sites/sites.module';
import { AttendanceModule } from './attendance/attendance.module';

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
    AuditLogModule,
    SitesModule,
    ServiceModule,
    AttendanceModule,
    FilesModule,
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), 'uploads/idpapers'),
        serveRoot: '/uploads/idpapers',
        serveStaticOptions: {
          maxAge: 3600000,
          setHeaders: (res) => {
            res.setHeader('Content-Disposition', 'attachment');
          },
        },
      },
      {
        rootPath: join(process.cwd(), 'uploads/personnelContracts'),
        serveRoot: '/uploads/personnelContracts',
        serveStaticOptions: {
          maxAge: 3600000,
          setHeaders: (res) => {
            res.setHeader('Content-Disposition', 'attachment');
          },
        },
      },
      {
        rootPath: join(process.cwd(), 'uploads/contracts'),
        serveRoot: '/uploads/contracts',
        serveStaticOptions: {
          maxAge: 3600000,
          setHeaders: (res) => {
            res.setHeader('Content-Disposition', 'attachment');
          },
        },
      },
    ),
    AttendanceModule,
  ],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  controllers: [AppController],
})
export class AppModule {}
