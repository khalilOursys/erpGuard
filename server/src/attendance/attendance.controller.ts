import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import {
  BulkUpdateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/update-attendance.dto';

@Controller('missions/:missionId/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async getAttendanceByMission(
    @Param('missionId', ParseIntPipe) missionId: number,
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getAttendanceByMission(
      missionId,
      companyId,
      date,
    );
  }

  @Get('summary')
  async getAttendanceSummary(
    @Param('missionId') missionId: number,
    @Query('companyId') companyId: number,
  ) {
    return this.attendanceService.getAttendanceSummary(missionId, companyId);
  }

  @Post()
  async createAttendance(
    @Query('companyId') companyId: number,
    @Body() createAttendanceDto: CreateAttendanceDto,
  ) {
    return this.attendanceService.createAttendance(
      companyId,
      createAttendanceDto,
    );
  }

  @Get(':attendanceId')
  async getAttendanceById(
    @Param('attendanceId') attendanceId: number,
    @Query('companyId') companyId: number,
  ) {
    return this.attendanceService.getAttendanceById(attendanceId, companyId);
  }

  @Put(':attendanceId')
  async updateAttendance(
    @Param('attendanceId') attendanceId: number,
    @Query('companyId') companyId: number,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateAttendance(
      attendanceId,
      companyId,
      updateAttendanceDto,
    );
  }

  @Put('bulk/update')
  async bulkUpdateAttendance(
    @Query('companyId') companyId: number,
    @Body() bulkUpdateDto: BulkUpdateAttendanceDto,
  ) {
    return this.attendanceService.bulkUpdateAttendance(
      companyId,
      bulkUpdateDto,
    );
  }

  @Delete(':attendanceId')
  async deleteAttendance(
    @Param('attendanceId') attendanceId: number,
    @Query('companyId') companyId: number,
  ) {
    return this.attendanceService.deleteAttendance(attendanceId, companyId);
  }

  @Post('replacements')
  async createReplacement(
    @Param('missionId') missionId: number,
    @Query('companyId') companyId: number,
    @Body()
    body: {
      assignmentId: number;
      startDate: string;
      endDate: string;
      replacementForId?: number;
      replacementPersonnelId?: number; // NEW: Accept replacement personnel ID
    },
  ) {
    console.log('test', body);

    console.log('Received replacement request:', {
      missionId,
      companyId,
      ...body,
    });

    return this.attendanceService.createReplacementAttendance(
      body.assignmentId,
      body.startDate,
      body.endDate,
      body.replacementForId,
      body.replacementPersonnelId,
    );
  }
}
