// src/attendance/attendance.controller.ts
import { Controller, Get, Patch, Body, Req, Query, UseGuards, BadRequestException, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Permissions('attendance.read')
  @Get('grid')
  async getGrid(
    @Req() req: any,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const companyId = req.user.companyId;
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.service.getGridData(companyId, startDateStr, endDateStr);
  }

  @Permissions('attendance.manage')
  @Patch('update')
  async update(
    @Req() req: any,
    @Body() body: any, // { contractSiteServiceId, postIndex, date, status, personnelId?, isAddingReplacement? }
  ) {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    return this.service.updateAttendance(companyId, userId, body);
  }

  @Permissions('attendance.manage')
  @Delete('assignment/:id')
  async deleteAssignment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const companyId = req.user.companyId;
    return this.service.deleteAssignment(companyId, id);
  }
}