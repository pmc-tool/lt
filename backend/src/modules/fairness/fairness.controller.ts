import { Controller, Get, Param } from '@nestjs/common';
import { FairnessService } from './fairness.service';

@Controller('fairness')
export class FairnessController {
  constructor(private fairnessService: FairnessService) {}

  @Get('verify/:drawId')
  async getVerificationData(@Param('drawId') drawId: string) {
    return this.fairnessService.getVerificationData(drawId);
  }

  @Get('verify/:drawId/compute')
  async verifyDrawResult(@Param('drawId') drawId: string) {
    return this.fairnessService.verifyDrawResult(drawId);
  }

  @Get('ticket/:ticketId/proof')
  async getTicketProof(@Param('ticketId') ticketId: string) {
    return this.fairnessService.getTicketProof(ticketId);
  }
}
