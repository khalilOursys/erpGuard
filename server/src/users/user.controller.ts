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
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { QueryUsersDto } from './dto/query-users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Permissions('users.manage')
  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const actorId = req.user?.id ?? null;
    return this.userService.create(dto, actorId);
  }

  @Permissions('users.read')
  @Get()
  async findAll(@Req() req: any, @Query() query: QueryUsersDto) {
    console.log('UserController - req.user:', req.user); // Debug req.user
    const companyId = req.user.companyId; // Dynamic companyId
    const result = await this.userService.findAll(companyId, {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc',
      deletedOnly: query.deletedOnly,
      role: query.role,
      permission: query.permission,
    });
    console.log('UserController - findAll result:', result); // Debug result
    return result;
  }

  @Permissions('users.read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Permissions('users.manage')
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const actor = req.user?.id;
    return this.userService.update(id, dto, actor);
  }

  @Permissions('users.manage')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actor = req.user?.id;
    return this.userService.remove(id, actor);
  }

  @Permissions('users.manage')
  @Post(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actor = req.user?.id;
    return this.userService.restore(id, actor);
  }

  @Permissions('users.manage')
  @Post(':id/permissions')
  async grantPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @Req() req: any,
  ) {
    const actor = req.user?.id;
    return this.userService.grantPermissions(id, dto.permissions, actor);
  }

  @Permissions('users.manage')
  @Delete(':id/permissions/:permissionName')
  async revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionName') permissionName: string,
  ) {
    return this.userService.revokePermission(id, permissionName);
  }
  @Permissions('users.manage')
  @Get(':id/permissions')
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getEffectivePermissions(id);
  }
  @Permissions('users.read') // Restrict to users with read access
  @Get('permissions/all')
  async getAllPermissions() {
    return this.userService.getAllPermissions();
  }
}
