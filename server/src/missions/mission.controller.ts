import {
  Controller,
  Get,
  Req,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { MissionService } from './mission.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { QueryMissionsDto } from './dto/query-missions.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('missions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MissionController {
  constructor(private svc: MissionService) {}

  @Permissions('missions.read')
  @Get()
  async findAll(@Req() req: any, @Query() query: QueryMissionsDto) {
    const companyId = req.user.companyId;
    return this.svc.findAll(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      siteId: query.siteId,
      startFrom: query.startFrom,
      startTo: query.startTo,
      deletedOnly: query.deletedOnly,
    });
  }

  @Permissions('missions.read')
  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.findOne(companyId, id);
  }

  @Permissions('missions.manage')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateMissionDto) {
    const companyId = req.user.companyId;
    const actor = req.user.id;
    return this.svc.create(companyId, dto, actor);
  }

  @Permissions('missions.manage')
  @Put(':id')
  async update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMissionDto) {
    const companyId = req.user.companyId;
    return this.svc.update(companyId, id, dto);
  }

  @Permissions('missions.manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.remove(companyId, id);
  }

  @Permissions('missions.manage')
  @Post(':id/restore')
  async restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.restore(companyId, id);
  }

  // Assignments
  @Permissions('missions.manage')
  @Post(':id/assignments')
  async addAssignment(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateAssignmentDto) {
    const companyId = req.user.companyId;
    const actor = req.user.id;
    return this.svc.addAssignment(companyId, id, dto, actor);
  }

  @Permissions('missions.read')
  @Get(':id/assignments')
  async listAssignments(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.listAssignments(companyId, id);
  }
}
