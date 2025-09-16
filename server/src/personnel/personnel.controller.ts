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
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { multerConfig } from 'src/config/multer.config';

@Controller('personnels')
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPersonnelDto: CreatePersonnelDto) {
    return this.personnelService.create(createPersonnelDto);
  }

  //This function fetches paginated data
  @Get()
  findPersonnels(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.personnelService.findPersonnels(companyId, page, limit);
  }

  //This function fetches all data without pagination
  @Get('findAllPersonnels')
  findAllPersonnels(@Query('companyId', ParseIntPipe) companyId: number) {
    return this.personnelService.findAllPersonnels(companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonnelDto: UpdatePersonnelDto,
  ) {
    return this.personnelService.update(id, updatePersonnelDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.restore(id);
  }

  // Contract endpoints
  @Get(':id/contracts')
  getPersonnelContracts(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.personnelService.getPersonnelContracts(id, page, limit);
  }

  @Post(':id/contracts/with-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @HttpCode(HttpStatus.CREATED)
  async createContractWithFile(
    @Param('id', ParseIntPipe) personnelId: number,
    @Body() createContractDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.personnelService.createContractWithFile(
      {
        ...createContractDto,
        personnelId,
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
    return this.personnelService.updateContractWithFile(
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

    return this.personnelService.uploadContractFile(contractId, file);
  }

  @Get('contracts/:contractId')
  getContractWithFile(@Param('contractId', ParseIntPipe) contractId: number) {
    return this.personnelService.getContractWithFile(contractId);
  }

  @Delete('contracts/:id')
  removeContract(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.removeContract(id);
  }

  @Post('contracts/:id/restore')
  restoreContract(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.restoreContract(id);
  }
}
