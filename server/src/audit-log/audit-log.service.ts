import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

export interface HierarchicalAuditLog {
  id: number;
  action: string;
  entity: string;
  entityId: number;
  timestamp: Date;
  userId: number;
  user: any;
  details?: any;
  parentId?: number | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  state?: string;
  managerId?: string | null;
  previousData?: any; // Added missing property
  newData?: any; // Added missing property
}
export interface AuditLogCreateParams {
  userId: number;
  action: string;
  entity: string;
  entityId: number;
  previousData?: any;
  newData?: any;
}
@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
  async createAuditLog(params: AuditLogCreateParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          previousData: params.previousData,
          newData: params.newData,
        },
      });
    } catch (error) {
      // Don't throw error to avoid breaking main functionality
      console.error('Failed to create audit log:', error);
    }
  }

  async findAuditLogsGroupedByCreationForEntity(
    entity: string,
  ): Promise<HierarchicalAuditLog[]> {
    const allAuditLogs = await this.prisma.auditLog.findMany({
      where: { entity },
      include: { user: true },
      orderBy: { timestamp: 'asc' },
    });

    const result: HierarchicalAuditLog[] = [];
    const logsByEntityId = new Map<number, any[]>();

    allAuditLogs.forEach((log) => {
      if (!logsByEntityId.has(log.entityId)) {
        logsByEntityId.set(log.entityId, []);
      }
      logsByEntityId.get(log.entityId)!.push(log);
    });

    for (const [entityId, logs] of logsByEntityId) {
      const createAction = logs.find((log) => log.action === 'CREATE');

      if (createAction) {
        result.push({
          id: createAction.id,
          action: createAction.action,
          previousData: createAction.previousData,
          newData: createAction.newData,
          entity: createAction.entity,
          entityId: createAction.entityId,
          timestamp: createAction.timestamp,
          userId: createAction.userId,
          user: createAction.user,
          details: createAction.details,
          parentId: null,
          firstName: createAction.entity || 'System',
          lastName: createAction.user?.lastName || 'User',
          email: createAction.user?.email || '',
          state: 'Active',
          managerId: null,
        });

        logs
          .filter((log) => log.action !== 'CREATE')
          .forEach((childAction) => {
            result.push({
              id: childAction.id,
              action: childAction.action,
              entity: childAction.entity,
              entityId: childAction.entityId,
              timestamp: childAction.timestamp,
              previousData: childAction.previousData,
              newData: childAction.newData,
              userId: childAction.userId,
              user: childAction.user,
              details: childAction.details,
              parentId: createAction.id,
              firstName: childAction.user?.firstName || 'System',
              lastName: childAction.user?.lastName || 'User',
              email: childAction.user?.email || '',
              state: 'Active',
              managerId: createAction.id,
            });
          });
      }
    }

    return result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async findAuditLogsGroupedByCreationForEntityId(
    entityId: number,
  ): Promise<HierarchicalAuditLog[]> {
    const allAuditLogs = await this.prisma.auditLog.findMany({
      where: { entityId },
      include: { user: true },
      orderBy: { timestamp: 'asc' },
    });

    // If no logs found for this entityId, return empty array
    if (allAuditLogs.length === 0) {
      return [];
    }

    const result: HierarchicalAuditLog[] = [];
    const createAction = allAuditLogs.find((log) => log.action === 'CREATE');

    if (createAction) {
      result.push({
        id: createAction.id,
        action: createAction.action,
        previousData: createAction.previousData,
        newData: createAction.newData,
        entity: createAction.entity,
        entityId: createAction.entityId,
        timestamp: createAction.timestamp,
        userId: createAction.userId,
        user: createAction.user,
        parentId: null,
        email: createAction.user?.email || '',
        state: 'Active',
        managerId: null,
      });

      allAuditLogs
        .filter((log) => log.action !== 'CREATE')
        .forEach((childAction) => {
          result.push({
            id: childAction.id,
            action: childAction.action,
            entity: childAction.entity,
            entityId: childAction.entityId,
            timestamp: childAction.timestamp,
            previousData: childAction.previousData,
            newData: childAction.newData,
            userId: childAction.userId,
            user: childAction.user,
            parentId: createAction.id,
            state: 'Active',
          });
        });
    } else {
      // If no CREATE action found, treat all logs as standalone entries
      allAuditLogs.forEach((log) => {
        result.push({
          id: log.id,
          action: log.action,
          previousData: log.previousData,
          newData: log.newData,
          entity: log.entity,
          entityId: log.entityId,
          timestamp: log.timestamp,
          userId: log.userId,
          user: log.user,
          parentId: null,
          email: log.user?.email || '',
        });
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async findAuditLogsForEntity(entity: string, entityId?: number) {
    const whereClause: any = { entity };
    if (entityId) {
      whereClause.entityId = entityId;
    }

    return this.prisma.auditLog.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });
  }
}
