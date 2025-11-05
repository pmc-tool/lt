import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { UsersAdminService, UserListQuery, BanUserDto } from './users-admin.service';
import { RBACGuard, Roles } from '../../shared/middleware/rbac.guard';
import { AdminRole } from '../admin/admin.service';

@Controller('admin/users')
@UseGuards(RBACGuard)
export class UsersAdminController {
  constructor(private usersAdminService: UsersAdminService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SUPPORT_AGENT)
  async listUsers(@Query() query: UserListQuery) {
    return this.usersAdminService.listUsers(query);
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.SUPPORT_AGENT)
  async getUserDetails(@Param('id') id: string) {
    return this.usersAdminService.getUserDetails(id);
  }

  @Get(':id/history')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.AUDITOR)
  async getUserHistory(@Param('id') id: string) {
    return this.usersAdminService.getUserHistory(id);
  }

  @Post(':id/ban')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_AGENT)
  async banUser(@Request() req: any, @Param('id') id: string, @Body() dto: BanUserDto) {
    return this.usersAdminService.banUser(req.user.userId, id, dto);
  }

  @Post(':id/unban')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_AGENT)
  async unbanUser(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.usersAdminService.unbanUser(req.user.userId, id, body.reason);
  }

  @Post(':id/flag')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_AGENT)
  async flagUser(@Request() req: any, @Param('id') id: string, @Body() body: { flags: string[] }) {
    return this.usersAdminService.flagUser(req.user.userId, id, body.flags);
  }
}
