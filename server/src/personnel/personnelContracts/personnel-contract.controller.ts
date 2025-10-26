import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { PersonnelContractService } from './personnel-contract.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreatePersonnelContractDto } from './dto/create-personnel-contract.dto';
import { UpdatePersonnelContractDto } from './dto/update-personnel-contract.dto';

@Controller('personnel/:personnelId/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonnelContractController {
  constructor(private readonly service: PersonnelContractService) {}

  @Permissions('personnel.read')
  @Get()
  async findAll(
    @Req() req,
    @Param('personnelId') personnelId: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 25,
    @Query('search') search: string = '',
    @Query('sortBy') sortBy: string = 'startDate',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query('deletedOnly') deletedOnly: boolean = false,
  ) {
    const companyId = req.user.companyId;
    return this.service.findAllForPersonnel(companyId, personnelId, {
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      deletedOnly,
    });
  }

  @Permissions('personnel.manage')
  @Post()
  @UseInterceptors(
    FileInterceptor('contractFile', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads/personnelContracts');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const tempId = Date.now();
          const ext = extname(file.originalname);
          const filename = `${tempId}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {  // Allow images and PDF
          cb(new Error('Only image or PDF files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async create(
    @Req() req,
    @Param('personnelId') personnelId: number,
    @Body() dto: CreatePersonnelContractDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = req.user.companyId;
    return this.service.create(companyId, personnelId, dto, file);
  }

  @Permissions('personnel.manage')
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('contractFile', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads/personnelContracts');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const contractId = req.params.id;
          const ext = extname(file.originalname);
          const filename = `${contractId}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
          cb(new Error('Only image or PDF files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async update(
    @Req() req,
    @Param('personnelId') personnelId: number,
    @Param('id') id: number,
    @Body() dto: UpdatePersonnelContractDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = req.user.companyId;
    return this.service.update(companyId, personnelId, id, dto, file);
  }

  @Permissions('personnel.manage')
  @Delete(':id')
  async softDelete(
    @Req() req,
    @Param('personnelId') personnelId: number,
    @Param('id') id: number,
  ) {
    const companyId = req.user.companyId;
    return this.service.softDelete(companyId, personnelId, id);
  }

  @Permissions('personnel.manage')
  @Post(':id/restore')
  async restore(
    @Req() req,
    @Param('personnelId') personnelId: number,
    @Param('id') id: number,
  ) {
    const companyId = req.user.companyId;
    return this.service.restore(companyId, personnelId, id);
  }
}