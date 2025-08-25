import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CompanyModule } from './company/company.module';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GuardModule } from './guard/guard.module';
import { QualificationModule } from './qualification/qualification.module';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CompanyModule,
    GuardModule,
    QualificationModule,
  ],
  providers: [AppService, PrismaService],
  controllers: [AppController],
})
export class AppModule {}
