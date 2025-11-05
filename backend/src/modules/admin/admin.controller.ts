import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService, AdminLoginDto, CreateDrawDto, UpdateDrawDto, AdminRole } from './admin.service';
import { RBACGuard, Roles } from '../../shared/middleware/rbac.guard';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.adminLogin(dto);
  }

  @Get('draws')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.AUDITOR)
  async listDraws(@Query() query: any) {
    return this.adminService.listDraws(query);
  }

  @Get('draws/:id')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER, AdminRole.AUDITOR)
  async getDraw(@Param('id') id: string) {
    return this.adminService.getDraw(id);
  }

  @Post('draws')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async createDraw(@Request() req: any, @Body() dto: CreateDrawDto) {
    return this.adminService.createDraw(req.user.userId, dto);
  }

  @Patch('draws/:id')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async updateDraw(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDrawDto) {
    return this.adminService.updateDraw(req.user.userId, id, dto);
  }

  @Post('draws/:id/close')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async closeDraw(@Request() req: any, @Param('id') id: string) {
    return this.adminService.closeDraw(req.user.userId, id);
  }

  @Post('draws/:id/settle')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.OPS_MANAGER)
  async settleDraw(@Request() req: any, @Param('id') id: string) {
    return this.adminService.settleDraw(req.user.userId, id);
  }

  @Delete('draws/:id')
  @UseGuards(RBACGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  async deleteDraw(@Request() req: any, @Param('id') id: string) {
    await this.adminService.deleteDraw(req.user.userId, id);
    return { success: true };
  }
}
