import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GuardService } from './guard.service';
import { CreateGuardDto } from './dto/create-guard.dto';
import { UpdateGuardDto } from './dto/update-guard.dto';
import { multerConfig } from 'src/config/multer.config';

@Controller('guards')
export class GuardController {
  constructor(private readonly guardService: GuardService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createGuardDto: CreateGuardDto) {
    return this.guardService.create(createGuardDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.guardService.findAll(companyId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.guardService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGuardDto: UpdateGuardDto,
  ) {
    return this.guardService.update(id, updateGuardDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.guardService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.guardService.restore(id);
  }

  // Contract endpoints
  @Get(':id/contracts')
  getGuardContracts(@Param('id', ParseIntPipe) id: number) {
    return this.guardService.getGuardContracts(id);
  }

  @Post(':id/contracts/with-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @HttpCode(HttpStatus.CREATED)
  async createContractWithFile(
    @Param('id', ParseIntPipe) guardId: number,
    @Body() createContractDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.guardService.createContractWithFile(
      {
        ...createContractDto,
        guardId,
      },
      file,
    );
  }

  @Put('contracts/:contractId/with-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async updateContractWithFile(
    @Param('contractId', ParseIntPipe) contractId: number,
    @Body() updateContractDto: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.guardService.updateContractWithFile(
      contractId,
      updateContractDto,
      file,
    );
  }

  @Post('contracts/:contractId/upload-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadContractFile(
    @Param('contractId', ParseIntPipe) contractId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.guardService.uploadContractFile(contractId, file);
  }

  @Get('contracts/:contractId')
  getContractWithFile(@Param('contractId', ParseIntPipe) contractId: number) {
    return this.guardService.getContractWithFile(contractId);
  }
}
