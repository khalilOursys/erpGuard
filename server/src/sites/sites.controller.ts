import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Req, UseGuards, Query } from '@nestjs/common';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { QuerySitesDto } from './dto/query-sites.dto';

@Controller('sites')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SitesController {
  constructor(private svc: SitesService) {}

  @Permissions('sites.read')
  @Get()
  async findAll(@Req() req: any, @Query() query: QuerySitesDto) {
    const companyId = req.user.companyId;
    return this.svc.findAll(companyId, query);
  }

  @Permissions('sites.read')
  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.findOne(companyId, id);
  }

  @Permissions('sites.manage')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateSiteDto) {
    const companyId = req.user.companyId;
    return this.svc.create(companyId, dto);
  }

  @Permissions('sites.manage')
  @Put(':id')
  async update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSiteDto) {
    const companyId = req.user.companyId;
    return this.svc.update(companyId, id, dto);
  }

  @Permissions('sites.manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.remove(companyId, id);
  }

  @Permissions('sites.manage')
  @Post(':id/restore')
  async restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.restore(companyId, id);
  }
}