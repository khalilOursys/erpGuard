import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('entity/:entity')
  async getAuditLogsForEntity(
    @Param('entity') entity: string,
    @Query('entityId') entityId?: number,
  ) {
    if (entityId) {
      return this.auditLogService.findAuditLogsForEntity(entity, entityId);
    }
    return this.auditLogService.findAuditLogsForEntity(entity);
  }

  @Get('hierarchy/:id')
  async getAuditLogsHierarchy(@Param('id') id: string) {
    const entityId = parseInt(id, 10);
    return this.auditLogService.findAuditLogsGroupedByCreationForEntityId(
      entityId,
    );
  }

  @Get('hierarchyByEntity/:entity')
  async getAuditLogsHierarchyByEntity(@Param('entity') entity: string) {
    return this.auditLogService.findAuditLogsGroupedByCreationForEntity(entity);
  }
  @Get('test-data')
  async getTestData() {
    // This returns sample data in the format you provided
    return [
      {
        id: '9s41rp',
        firstName: 'Kelvin',
        lastName: 'Langosh',
        email: 'Jerod14@hotmail.com',
        state: 'Ohio',
        managerId: '08m6rx',
        action: 'UPDATE',
        entity: 'Employee',
        entityId: 1,
        timestamp: new Date('2023-01-15'),
      },
      {
        id: '08m6rx',
        firstName: 'Molly',
        lastName: 'Purdy',
        email: 'Hugh.Dach79@hotmail.com',
        state: 'Rhode Island',
        managerId: '5ymtrc',
        action: 'CREATE',
        entity: 'Employee',
        entityId: 2,
        timestamp: new Date('2023-01-10'),
      },
      {
        id: '5ymtrc',
        firstName: 'Henry',
        lastName: 'Lynch',
        email: 'Camden.Macejkovic@yahoo.com',
        state: 'California',
        managerId: null,
        action: 'CREATE',
        entity: 'Employee',
        entityId: 3,
        timestamp: new Date('2023-01-05'),
      },
    ];
  }
}
