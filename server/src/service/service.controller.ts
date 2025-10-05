import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServicesDto } from './dto/query-service.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust path
import { PermissionsGuard } from '../common/guards/permissions.guard'; // Adjust path
import { Permissions } from '../common/decorators/permissions.decorator'; // Adjust path

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('services.manage')
  create(@Body() createServiceDto: CreateServiceDto, @Req() req: any) {
    const companyId = req.user.companyId;
    const actorUserId = req.user.id;
    return this.serviceService.create({ ...createServiceDto, companyId }, actorUserId);
  }

  @Get()
  @Permissions('services.read')
  async findAll(@Req() req: any, @Query() query: QueryServicesDto) {
    const companyId = req.user.companyId;
    return this.serviceService.findAll(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      deletedOnly: query.deletedOnly,
      inactiveOnly: query.inactiveOnly,
    });
  }

  @Get(':id')
  @Permissions('services.read')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.serviceService.findOne(companyId, id);
  }

  @Put(':id')
  @Permissions('services.manage')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const companyId = req.user.companyId;
    const actorUserId = req.user.id;
    return this.serviceService.update(companyId, id, { ...updateServiceDto, companyId }, actorUserId);
  }

  @Delete(':id')
  @Permissions('services.manage')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    const actorUserId = req.user.id;
    return this.serviceService.remove(companyId, id, actorUserId);
  }

  @Post(':id/restore')
  @Permissions('services.manage')
  restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    const actorUserId = req.user.id;
    return this.serviceService.restore(companyId, id, actorUserId);
  }
}