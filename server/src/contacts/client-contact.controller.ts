import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  Req,
} from '@nestjs/common';
import { ClientContactService } from './client-contact.service';
import { CreateClientContactDto } from './dto/create-client-contact.dto';
import { UpdateClientContactDto } from './dto/update-client-contact.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('clients/:clientId/contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientContactController {
  constructor(private readonly service: ClientContactService) {}

  @Permissions('client.manage')
  @Post()
  async create(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Body() dto: CreateClientContactDto,
    @Req() req: any,
  ) {
    const actorclientId = req.user.clientId;
    return this.service.create(clientId, dto, actorclientId);
  }

  @Permissions('client.read')
  @Get()
  async findAll(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any) {
    const actorclientId = req.user.clientId;
    return this.service.findAll(clientId, actorclientId);
  }

  @Permissions('client.read')
  @Get(':id')
  async findOne(@Param('clientId', ParseIntPipe) clientId: number, @Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorclientId = req.user.clientId;
    return this.service.findOne(clientId, id, actorclientId);
  }

  @Permissions('client.manage')
  @Put(':id')
  async update(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientContactDto,
    @Req() req: any,
  ) {
    const actorclientId = req.user.clientId;
    return this.service.update(clientId, id, dto, actorclientId);
  }

  @Permissions('client.manage')
  @Delete(':id')
  async remove(@Param('clientId', ParseIntPipe) clientId: number, @Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorclientId = req.user.clientId;
    return this.service.remove(clientId, id, actorclientId);
  }
}
