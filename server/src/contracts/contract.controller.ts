import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Query,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
// file upload imports
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';

// optional: import FilesService if you want controller to create file rows directly
import { FilesService } from 'src/files/files.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractController {
  constructor(
    private readonly svc: ContractService,
    private readonly filesService: FilesService, // FilesService is provided by FilesModule (see module patch below)
  ) {}

  @Permissions('contracts.create')
  @Post()
  async create(@Body() dto: CreateContractDto, @Req() req: any) {
    const companyId = req.user.companyId;
    const actor = req.user.id;
    return this.svc.create(companyId, dto, actor);
  }

  @Permissions('contracts.read')
  @Get()
  async findAll(@Req() req: any, @Query() query: QueryContractsDto) {
    const companyId = req.user.companyId;
    return this.svc.findAll(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status,
    });
  }

  @Permissions('contracts.read')
  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    return this.svc.findOne(companyId, id);
  }

  @Permissions('contracts.read')
  @Get(':id/missions')
  async getContractMissions(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const companyId = req.user.companyId;
    return this.svc.getMissionsForContract(companyId, id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Permissions('contracts.manage')
  @Patch(':id/submit')
  async submit(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    const actor = req.user.id;
    return this.svc.submitForReview(companyId, id, actor);
  }

  @Permissions('contracts.manage') // Adjust permission as needed (e.g., same as create/submit)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
  ) {
    const companyId = req.user.companyId;
    const actor = req.user.id;
    return this.svc.update(companyId, id, dto, actor);
  }

  @Permissions('contracts.confirm')
  @Patch(':id/confirm')
  async confirm(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user.companyId;
    const confirmer = req.user.id;
    return this.svc.confirm(companyId, id, confirmer);
  }

  @Permissions('contracts.confirm')
  @Patch(':id/reject')
  async reject(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    const companyId = req.user.companyId;
    const confirmer = req.user.id;
    return this.svc.reject(companyId, id, confirmer, body?.reason);
  }

  // Upload and attach PDF to contract in one step.
  // Multipart form field name: "file"
  @Permissions('contracts.manage')
  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = `${process.cwd()}/uploads/contracts`;
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname) || '';
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadContractFile(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const companyId = req.user.companyId;
    const actor = req.user?.id;
    if (!actor) throw new BadRequestException('Authenticated user required');

    if (!file) throw new BadRequestException('File not provided or invalid');

    // Create file record (FilesService saves metadata)
    const rec = await this.filesService.createFileRecord(file, actor);

    // Attach file to contract
    return this.svc.attachFile(companyId, id, rec.id, actor);
  }
}
