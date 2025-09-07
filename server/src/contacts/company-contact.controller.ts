import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  Req,
} from '@nestjs/common';
import { CompanyContactService } from './company-contact.service';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('companies/:companyId/contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyContactController {
  constructor(private readonly service: CompanyContactService) {}

  @Permissions('company.manage')
  @Post()
  async create(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: CreateCompanyContactDto,
    @Req() req: any,
  ) {
    const actorCompanyId = req.user.companyId;
    return this.service.create(companyId, dto, actorCompanyId);
  }

  @Permissions('company.read')
  @Get()
  async findAll(@Param('companyId', ParseIntPipe) companyId: number, @Req() req: any) {
    const actorCompanyId = req.user.companyId;
    return this.service.findAll(companyId, actorCompanyId);
  }

  @Permissions('company.read')
  @Get(':id')
  async findOne(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const actorCompanyId = req.user.companyId;
    return this.service.findOne(companyId, id, actorCompanyId);
  }

  @Permissions('company.manage')
  @Put(':id')
  async update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyContactDto,
    @Req() req: any,
  ) {
    const actorCompanyId = req.user.companyId;
    return this.service.update(companyId, id, dto, actorCompanyId);
  }

  @Permissions('company.manage')
  @Delete(':id')
  async remove(@Param('companyId', ParseIntPipe) companyId: number, @Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorCompanyId = req.user.companyId;
    return this.service.remove(companyId, id, actorCompanyId);
  }
}
