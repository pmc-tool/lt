import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService, AuditLogQuery } from './audit.service';
import { RBACGuard, Roles } from '../../shared/middleware/rbac.guard';
import { AdminRole } from '../admin/admin.service';

@Controller('admin/audit')
@UseGuards(RBACGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.AUDITOR)
  async listLogs(@Query() query: AuditLogQuery) {
    return this.auditService.listAuditLogs(query);
  }

  @Get('logs/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.AUDITOR)
  async getLog(@Param('id') id: string) {
    return this.auditService.getAuditLog(id);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.AUDITOR)
  async getStats(@Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.auditService.getAuditStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('export')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.AUDITOR)
  async exportLogs(@Query() query: AuditLogQuery) {
    return this.auditService.exportAuditLogs(query);
  }
}
