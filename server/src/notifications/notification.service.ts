import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async listForUser(userId: number, options: { page?: number; pageSize?: number } = {}) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;
    const where = { userId };
    const total = await this.prisma.notification.count({ where });
    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { total, page, pageSize, data: items };
  }

  async markRead(userId: number, notificationId: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id: notificationId }});
    if (!notif || notif.userId !== userId) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id: notificationId }, data: { read: true }});
  }
}
