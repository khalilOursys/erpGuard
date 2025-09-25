import {
  Controller, Post, Body, UseGuards, Get, Param, ParseIntPipe, Put, Delete, Req, Query, Patch,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { QueryClientsDto } from './dto/query-clients.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateClientContactDto } from './dto/create-client-contact.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientController {
  constructor(private readonly service: ClientService) {}

  @Permissions('client.manage')
  @Post()
  async create(@Body() dto: CreateClientDto, @Req() req: any) {
    const companyId = req.user.companyId;
    const actor = req.user?.id;
    return this.service.create(companyId, dto, actor);
  }

  @Permissions('client.read')
  @Get()
  async findAll(@Req() req: any, @Query() query: QueryClientsDto) {
    const companyId = req.user.companyId;
    return this.service.findAll(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      deletedOnly: query.deletedOnly,
      type: query.type,
    });
  }

  @Permissions('client.read')
  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Query('withDeleted') withDeleted?: string) {
    const companyId = req.user.companyId;
    return this.service.findOne(companyId, id, withDeleted === 'true');
  }

  @Permissions('client.manage')
  @Put(':id')
  async update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    const companyId = req.user.companyId;
    return this.service.update(companyId, id, dto);
  }

  @Permissions('client.manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.service.remove(companyId, id);
  }

  @Permissions('client.manage')
  @Post(':id/restore')
  async restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.service.restore(companyId, id);
  }

  // Sites
  @Permissions('client.manage')
  @Post(':id/sites')
  async addSite(@Req() req: any, @Param('id', ParseIntPipe) clientId: number, @Body() dto: CreateSiteDto) {
    const companyId = req.user.companyId;
    return this.service.addSite(companyId, clientId, dto);
  }

  @Permissions('client.manage')
  @Patch('sites/:siteId')
  async updateSite(@Req() req: any, @Param('siteId', ParseIntPipe) siteId: number, @Body() dto: UpdateSiteDto) {
    const companyId = req.user.companyId;
    return this.service.updateSite(companyId, siteId, dto);
  }

  @Permissions('client.manage')
  @Delete('sites/:siteId')
  async removeSite(@Req() req: any, @Param('siteId', ParseIntPipe) siteId: number) {
    const companyId = req.user.companyId;
    return this.service.removeSite(companyId, siteId);
  }

  @Permissions('client.manage')
  @Post('sites/:siteId/restore')
  async restoreSite(@Req() req: any, @Param('siteId', ParseIntPipe) siteId: number) {
    const companyId = req.user.companyId;
    return this.service.restoreSite(companyId, siteId);
  }

  // Contacts
  @Permissions('client.manage')
  @Post(':id/contacts')
  async addContact(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateClientContactDto) {
    const companyId = req.user.companyId;
    return this.service.addContact(companyId, id, dto);
  }

  @Permissions('client.manage')
  @Patch('contacts/:contactId')
  async updateContact(@Req() req: any, @Param('contactId', ParseIntPipe) contactId: number, @Body() dto: any) {
    const companyId = req.user.companyId;
    return this.service.updateContact(companyId, contactId, dto);
  }

  @Permissions('client.manage')
  @Delete('contacts/:contactId')
  async removeContact(@Req() req: any, @Param('contactId', ParseIntPipe) contactId: number) {
    const companyId = req.user.companyId;
    return this.service.removeContact(companyId, contactId);
  }

  @Permissions('client.manage')
  @Post('contacts/:contactId/restore')
  async restoreContact(@Req() req: any, @Param('contactId', ParseIntPipe) contactId: number) {
    const companyId = req.user.companyId;
    return this.service.restoreContact(companyId, contactId);
  }
}
