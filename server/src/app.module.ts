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
import { ServiceModule } from './service/service.module';
import { FilesModule } from './files/files.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SitesModule } from './sites/sites.module';
import { BillingModule } from './billing/billing.module';

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
    SitesModule,
    ServiceModule,
    FilesModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads/contracts'), // Absolute path to the folder
      serveRoot: '/uploads/contracts', // URL prefix to match your DB URLs (e.g., /uploads/contracts/123456.pdf)
      serveStaticOptions: {
        // Optional: Cache control, etc., for production
        maxAge: 3600000, // 1 hour cache
        setHeaders: (res) => {
          res.setHeader('Content-Disposition', 'attachment'); // Force download instead of inline view (optional, but good for PDFs)
        },
      },
    }),
    BillingModule,
  ],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  controllers: [AppController],
})
export class AppModule {}
