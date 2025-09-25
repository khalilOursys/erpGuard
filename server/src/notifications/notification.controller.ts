import { Controller, Get, Req, UseGuards, Query, Param, ParseIntPipe, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationController {
  constructor(private svc: NotificationService) {}

  // list mapped to GET /notifications
  @Permissions('notifications.read')
  @Get()
  async list(@Req() req: any, @Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    const userId = req.user.id;
    return this.svc.listForUser(userId, { page, pageSize });
  }

  @Permissions('notifications.read')
  @Post(':id/read')
  async markRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.svc.markRead(userId, id);
  }
}
