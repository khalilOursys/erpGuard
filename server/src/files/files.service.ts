import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private uploadDir = path.join(process.cwd(), 'uploads/contracts');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file (multer stores file on disk) into DB File record.
   * @param file multer file object
   * @param uploadedBy user id
   */
  async createFileRecord(file: Express.Multer.File, uploadedBy?: number) {
    if (!file) throw new BadRequestException('File missing');

    const url = `/uploads/contracts/${file.filename}`; // Serve statically with your static serve config or reverse proxy.

    try {
      const rec = await this.prisma.file.create({
        data: {
          url,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: uploadedBy ?? null,
          provider: 'local',
        },
      });
      return rec;
    } catch (err) {
      // If DB save fails, remove uploaded file
      try { fs.unlinkSync(path.join(this.uploadDir, file.filename)); } catch (e) {}
      throw new InternalServerErrorException('Failed to save file metadata');
    }
  }
}
