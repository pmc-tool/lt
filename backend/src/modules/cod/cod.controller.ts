import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CODService, CODListQuery, AssignCODDto, UpdateCODStatusDto } from './cod.service';
import { RBACGuard, Roles } from '../../shared/middleware/rbac.guard';
import { AdminRole } from '../admin/admin.service';

@Controller('admin/cod')
@UseGuards(RBACGuard)
export class CODController {
  constructor(private codService: CODService) {}

  @Get('tasks')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SUPPORT_AGENT)
  async listTasks(@Query() query: CODListQuery) {
    return this.codService.listCODTasks(query);
  }

  @Get('tasks/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SUPPORT_AGENT)
  async getTask(@Param('id') id: string) {
    return this.codService.getCODTask(id);
  }

  @Post('tasks/assign')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async assignTasks(@Body() dto: AssignCODDto) {
    return this.codService.assignCODTasks(dto);
  }

  @Patch('tasks/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SUPPORT_AGENT)
  async updateTaskStatus(@Param('id') id: string, @Body() dto: UpdateCODStatusDto) {
    return this.codService.updateCODStatus(id, dto);
  }

  @Get('routes/export')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async exportRoutes(@Query('agent') agent?: string) {
    return this.codService.exportCODRoutes(agent);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async getStats() {
    return this.codService.getCODStats();
  }
}
