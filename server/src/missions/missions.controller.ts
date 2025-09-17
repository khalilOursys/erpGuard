import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  DefaultValuePipe,
  Put,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  create(@Body() createMissionDto: CreateMissionDto) {
    return this.missionsService.create(createMissionDto);
  }

  @Get()
  async findAll(
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('contractId', ParseIntPipe) contractId: number,
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.missionsService.findAll(
      companyId,
      contractId,
      page,
      limit,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, companyId: number) {
    return this.missionsService.findOne(id, companyId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMissionDto: UpdateMissionDto,
    companyId: number,
  ) {
    return this.missionsService.update(id, updateMissionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, companyId: number) {
    return this.missionsService.remove(id, companyId);
  }

  @Get(':id/requirements')
  getMissionRequirements(
    @Param('id', ParseIntPipe) id: number,
    companyId: number,
  ) {
    return this.missionsService.getMissionRequirements(id, companyId);
  }
}
