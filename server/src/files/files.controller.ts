import {
  Controller, Post, UseGuards, UploadedFile, UseInterceptors, Req, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FilesService } from './files.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import * as fs from 'fs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Permissions('contracts.manage') // allow contract managers to upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = `${process.cwd()}/uploads/contracts`;
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname) || '';
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      // Accept only PDF for contract uploads; you can allow more types if needed
      if (file.mimetype !== 'application/pdf') {
        return cb(new BadRequestException('Only PDF files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('File not provided or invalid');
    const userId = req.user?.id ?? null;
    const rec = await this.filesService.createFileRecord(file, userId);
    return rec;
  }
}
