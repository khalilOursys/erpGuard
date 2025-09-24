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
  DefaultValuePipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServicesDto } from './dto/query-service.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('services.manage')
  create(@Body() createServiceDto: CreateServiceDto, @Req() req: any) {
    const actor = req.user?.id;
    return this.serviceService.create(createServiceDto, actor);
  }

  @Get()
  @Permissions('services.read')
  async findServices(@Req() req: any, @Query() query: QueryServicesDto) {
    const companyId = req.user.companyId; // Dynamic companyId
    const result = await this.serviceService.findServices(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
      deletedOnly: query.deletedOnly,
    });
    return result;
  }
  @Get('findAllServices')
  @Permissions('services.read')
  findAllServices(
    @Query('companyId', new DefaultValuePipe(0), ParseIntPipe)
    companyId: number,
  ) {
    return this.serviceService.findAllServices(companyId);
  }

  @Get(':id')
  @Permissions('services.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.findOne(id);
  }

  @Put(':id')
  @Permissions('services.manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req: any,
  ) {
    const actor = req.user?.id;
    return this.serviceService.update(id, updateServiceDto, actor);
  }

  @Delete(':id')
  @Permissions('services.manage')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const actor = req.user?.id;
    return this.serviceService.remove(id, actor);
  }
  @Post(':id/restore')
  @Permissions('services.manage')
  async restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const actor = req.user?.id;
    return this.serviceService.restore(id, actor);
  }
}
