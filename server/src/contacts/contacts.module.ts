import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CompanyContactService } from './company-contact.service';
import { CompanyContactController } from './company-contact.controller';
import { ClientContactService } from './client-contact.service';
import { ClientContactController } from './client-contact.controller';

@Module({
  controllers: [CompanyContactController, ClientContactController],
  providers: [CompanyContactService, ClientContactService, PrismaService],
  exports: [CompanyContactService, ClientContactService],
})
export class ContactsModule {}
