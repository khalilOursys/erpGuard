// src/billings/billings.controller.ts
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
  DefaultValuePipe,
  HttpStatus,
  HttpCode,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingStatus } from '@prisma/client';
import { BillingService } from './billing.service';
import { QueryBillingDto } from './dto/query-billing.dto';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('billings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  create(@Body() createBillingDto: CreateBillingDto) {
    return this.billingService.create(createBillingDto);
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: QueryBillingDto) {
    console.log('UserController - req.user:', req.user); // Debug req.user
    const companyId = req.user.companyId; // Dynamic companyId
    const result = await this.billingService.findAll(companyId, {
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

  @Get('summary')
  getSummary(@Query('companyId', ParseIntPipe) companyId: number) {
    return this.billingService.getBillingSummary(companyId);
  }

  @Get('invoice/:invoiceNumber')
  findByInvoiceNumber(
    @Query('companyId', ParseIntPipe) companyId: number,
    @Param('invoiceNumber') invoiceNumber: string,
  ) {
    return this.billingService.findByInvoiceNumber(companyId, invoiceNumber);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBillingDto: UpdateBillingDto,
  ) {
    return this.billingService.update(id, updateBillingDto);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: BillingStatus,
  ) {
    return this.billingService.updateStatus(id, status);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.remove(id);
  }
}
