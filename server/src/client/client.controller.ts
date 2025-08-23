// src/client/client.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { multerConfig } from '../config/multer.config';
import { CreateClientContractDto } from './dto/create-client-contract.dto';
import { UpdatClientContractDto } from './dto/update-client-contract.dto';

@Controller('clients') // Changed from 'client' to 'clients' for RESTful plural
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('companyId', ParseIntPipe) companyId: number,
  ) {
    return this.clientService.findAll(companyId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.restore(id);
  }
  // Contract endpoints
  @Get(':id/contracts')
  getClientContracts(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.getClientContracts(id);
  }

  @Post(':id/contracts/with-file')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @HttpCode(HttpStatus.CREATED)
  async createContractWithFile(
    @Param('id', ParseIntPipe) clientId: number,
    @Body() createContractDto: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.clientService.createContractWithFile(
      {
        ...createContractDto,
        clientId,
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
    return this.clientService.updateContractWithFile(
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

    return this.clientService.uploadContractFile(contractId, file);
  }

  @Get('contracts/:contractId')
  getContractWithFile(@Param('contractId', ParseIntPipe) contractId: number) {
    return this.clientService.getContractWithFile(contractId);
  }
}
