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
import { PersonnelService } from './personnel.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Controller('personnel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PersonnelController {
  constructor(private readonly personnelService: PersonnelService) {}

  @Permissions('personnel.read')
  @Get()
  async findAll(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 25,
    @Query('search') search: string = '',
    @Query('identifierType') identifierType: string,
    @Query('deletedOnly') deletedOnly: boolean = false,
    @Query('sortBy') sortBy: string = 'lastName',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const companyId = req.user.companyId;
    return this.personnelService.findAll(companyId, {
      page,
      pageSize,
      search,
      identifierType,
      deletedOnly,
      sortBy,
      sortOrder,
    });
  }
  @Permissions('personnel.manage')
  @Post()
  @UseInterceptors(
    FileInterceptor('idPicture', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads/idpapers');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const tempId = Date.now();
          const ext = extname(file.originalname);
          const filename = `${tempId}${ext}`;
          console.log(
            `Saving file as: ${join(process.cwd(), 'uploads/idpapers', filename)}`,
          );
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new Error('Only image files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async create(
    @Req() req,
    @Body() createPersonnelDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('Create DTO:', createPersonnelDto);
    console.log(
      'Received file:',
      file
        ? {
            path: file.path,
            filename: file.filename,
            originalname: file.originalname,
          }
        : 'No file',
    );
    const companyId = req.user.companyId;
    return this.personnelService.create(companyId, createPersonnelDto, file);
  }
  @Permissions('personnel.manage')
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('idPicture', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'uploads/idpapers');
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const personnelId = req.params.id;
          const ext = extname(file.originalname);
          const filename = `${personnelId}${ext}`;
          console.log(
            `Saving file as: ${join(process.cwd(), 'Uploads/idpapers', filename)}`,
          );
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new Error('Only image files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  @Permissions('personnel.manage')
  @Put(':id')
  @UseInterceptors(/* existing FileInterceptor */)
  async update(
    @Req() req,
    @Param('id') id: number,
    @Body() updatePersonnelDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = req.user.companyId;
    return this.personnelService.update(
      companyId,
      id,
      updatePersonnelDto,
      file,
    );
  }
  @Permissions('personnel.manage')
  @Delete(':id')
  async softDelete(@Req() req, @Param('id') id: number) {
    const companyId = req.user.companyId;
    return this.personnelService.softDelete(companyId, id);
  }
  @Permissions('personnel.manage')
  @Post(':id/restore')
  async restore(@Req() req, @Param('id') id: number) {
    const companyId = req.user.companyId;
    return this.personnelService.restore(companyId, id);
  }
}
