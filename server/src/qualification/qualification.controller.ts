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
} from '@nestjs/common';
import { QualificationService } from './qualification.service';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';

@Controller('qualifications')
export class QualificationController {
  constructor(private readonly qualificationService: QualificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createQualificationDto: CreateQualificationDto) {
    return this.qualificationService.create(createQualificationDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('companyId', new DefaultValuePipe(0), ParseIntPipe)
    companyId: number,
  ) {
    return this.qualificationService.findAll(companyId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.qualificationService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQualificationDto: UpdateQualificationDto,
  ) {
    return this.qualificationService.update(id, updateQualificationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.qualificationService.remove(id);
  }
}
