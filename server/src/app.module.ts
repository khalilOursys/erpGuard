import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CompanyModule } from './company/company.module';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { ClientModule } from './client/client.module';
import { AppService } from './app.service';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CitiesModule } from './cities/cities.module';
import { PersonnelModule } from './personnel/personnel.module';
import { ServiceModule } from './service/service.module';
import { MissionsModule } from './missions/missions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CompanyModule,
    ClientModule,
    CitiesModule,
    PersonnelModule,
    ServiceModule,
    MissionsModule,
  ],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  controllers: [AppController],
})
export class AppModule {}
