import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RBACGuard, Roles } from '../../shared/middleware/rbac.guard';
import { AdminRole } from '../admin/admin.service';

@Controller('admin/reports')
@UseGuards(RBACGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('sales')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.AUDITOR)
  async getSalesReport(@Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportsService.getSalesReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('cod')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async getCODReport(@Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportsService.getCODReport(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Get('draw/:drawId')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.AUDITOR)
  async getDrawReport(@Param('drawId') drawId: string) {
    return this.reportsService.getDrawReport(drawId);
  }

  @Get('abuse')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_AGENT, AdminRole.AUDITOR)
  async getAbuseMetrics(@Query('start_date') startDate?: string, @Query('end_date') endDate?: string) {
    return this.reportsService.getAbuseMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }
}
