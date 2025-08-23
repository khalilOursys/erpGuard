import {
  Controller, Get, Post, Body, Param, Delete, ParseIntPipe, Put, UseGuards, HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Post()
  @RequirePermissions('company.manage') // only admins / company managers create users by default
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermissions('company.manage') // list users for company admins
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('company.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('company.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions('company.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/restore')
  @RequirePermissions('company.manage')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }
}
