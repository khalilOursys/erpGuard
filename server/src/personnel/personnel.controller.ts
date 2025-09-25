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
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { multerConfig } from 'src/config/multer.config';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { QueryPersonnelsDto } from './dto/query-personnel.dto';
import { QueryContractsDto } from './dto/query-contract.dto';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('personnels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('personnel.manage')
  create(@Body() createPersonnelDto: CreatePersonnelDto) {
    return this.personnelService.create(createPersonnelDto);
  }

  //This function fetches paginated data
  @Get()
  @Permissions('personnel.read')
  async findPersonnels(@Req() req: any, @Query() query: QueryPersonnelsDto) {
    console.log('UserController - req.user:', req.user); // Debug req.user
    const companyId = req.user.companyId; // Dynamic companyId
    const result = await this.personnelService.findPersonnels(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
      deletedOnly: query.deletedOnly,
    });
    console.log('UserController - findAll result:', result); // Debug result
    return result;
  }

  //This function fetches all data without pagination
  @Get('findAllPersonnels')
  @Permissions('personnel.read')
  findAllPersonnels(@Query('companyId', ParseIntPipe) companyId: number) {
    return this.personnelService.findAllPersonnels(companyId);
  }

  @Get(':id')
  @Permissions('personnel.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.findOne(id);
  }

  @Put(':id')
  @Permissions('personnel.manage')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonnelDto: UpdatePersonnelDto,
  ) {
    return this.personnelService.update(id, updatePersonnelDto);
  }

  @Delete(':id')
  @Permissions('personnel.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.remove(id);
  }

  @Post(':id/restore')
  @Permissions('personnel.manage')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.restore(id);
  }

  // Contract endpoints
  @Get(':personnelId/contracts')
  @Permissions('personnel.read')
  async getPersonnelContracts(
    @Param('personnelId', ParseIntPipe) personnelId: number,
    @Req() req: any,
    @Query() query: QueryContractsDto,
  ) {
    const companyId = req.user.companyId; // Dynamic companyId
    const result = await this.personnelService.getPersonnelContracts(
      personnelId,
      {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder as 'asc' | 'desc',
        deletedOnly: query.deletedOnly,
        startDate: query.startDate,
        endDate: query.endDate,
      },
    );
    console.log('UserController - findAll result:', result); // Debug result
    return result;
  }

  @Post(':id/contracts/with-file')
  @Permissions('personnel.manage')
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
  @Permissions('personnel.manage')
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
  @Permissions('personnel.manage')
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
  @Permissions('personnel.read')
  getContractWithFile(@Param('contractId', ParseIntPipe) contractId: number) {
    return this.personnelService.getContractWithFile(contractId);
  }

  @Delete('contracts/:id')
  @Permissions('personnel.manage')
  removeContract(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.removeContract(id);
  }

  @Post('contracts/:id/restore')
  @Permissions('personnel.manage')
  restoreContract(@Param('id', ParseIntPipe) id: number) {
    return this.personnelService.restoreContract(id);
  }
}
