// src/contracts/contract.controller.ts
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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname, join } from 'path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractController {
  constructor(private readonly svc: ContractService) {}

  @Permissions('contracts.create')
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/contracts');
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Use a temporary filename; service will rename to contract ID
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  async create(
    @Req() req: any,
    @Body('data') dataStr: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!dataStr) {
      throw new BadRequestException('Missing data field');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(dataStr);
    } catch (err) {
      throw new BadRequestException('Invalid data format: must be valid JSON');
    }

    const dto = plainToInstance(CreateContractDto, parsedData);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.map((e) => Object.values(e.constraints || {})).flat(),
      );
    }

    const companyId = req.user.companyId;
    const actor = req.user.id;

    return this.svc.create(companyId, dto, actor, file);
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
  @Get('getContractByIdClient/:clientId')
  async getContractByIdClient(
    @Req() req: any,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    const companyId = req.user.companyId;
    return this.svc.getContractByIdClient(clientId);
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

  @Permissions('contracts.manage')
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/contracts');
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Use a temporary filename; service will rename to contract ID
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('data') dataStr: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!dataStr) {
      throw new BadRequestException('Missing data field');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(dataStr);
    } catch (err) {
      throw new BadRequestException('Invalid data format: must be valid JSON');
    }

    const dto = plainToInstance(UpdateContractDto, parsedData);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.map((e) => Object.values(e.constraints || {})).flat(),
      );
    }

    const companyId = req.user.companyId;
    const actor = req.user.id;

    return this.svc.update(companyId, id, dto, actor, file);
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

  @Permissions('contracts.manage')
  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads/contracts');
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Use a temporary filename; service will rename to contract ID
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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

    return this.svc.attachFile(companyId, id, file, actor);
  }
}