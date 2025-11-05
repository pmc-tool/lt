import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService, UpdateProfileDto, CreateAddressDto } from './users.service';
import { AuthGuard } from '../../shared/middleware/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Get('me/addresses')
  async getAddresses(@Request() req: any) {
    return this.usersService.getAddresses(req.user.userId);
  }

  @Post('me/addresses')
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.userId, dto);
  }
}
