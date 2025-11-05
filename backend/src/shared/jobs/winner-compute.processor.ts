import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw, DrawStatus } from '../database/entities/draw.entity';
import { Ticket, TicketStatus } from '../database/entities/ticket.entity';
import {
  FairnessEvent,
  FairnessEventType,
} from '../database/entities/fairness-event.entity';
import { CryptoService } from '../crypto/crypto.service';

export interface WinnerComputeJobData {
  drawId: string;
}

@Processor('winner-compute')
export class WinnerComputeProcessor {
  private readonly logger = new Logger(WinnerComputeProcessor.name);

  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(FairnessEvent)
    private fairnessEventRepository: Repository<FairnessEvent>,
    private cryptoService: CryptoService,
  ) {}

  @Process()
  async handleWinnerCompute(job: Job<WinnerComputeJobData>): Promise<void> {
    const { drawId } = job.data;
    this.logger.log(`Computing winner for draw ${drawId}`);

    try {
      // 1. Find the draw
      const draw = await this.drawRepository.findOne({ where: { id: drawId } });

      if (!draw) {
        throw new Error(`Draw ${drawId} not found`);
      }

      if (draw.status !== DrawStatus.CLOSED) {
        throw new Error(`Draw ${drawId} is not in CLOSED status`);
      }

      if (!draw.merkle_root) {
        throw new Error(`Draw ${drawId} does not have a merkle root`);
      }

      if (!draw.beacon_value) {
        throw new Error(`Draw ${drawId} does not have a beacon value`);
      }

      if (draw.winner_ticket_id) {
        this.logger.warn(`Draw ${drawId} already has a winner, skipping`);
        return;
      }

      // 2. Get all paid tickets to find the winner
      const paidTickets = await this.ticketRepository.find({
        where: {
          draw_id: drawId,
          status: TicketStatus.PAID,
        },
        order: {
          serial: 'ASC',
        },
      });

      if (paidTickets.length === 0) {
        throw new Error(`No paid tickets found for draw ${drawId}`);
      }

      // 3. Compute winner
      const { hash, winnerIndex } = this.cryptoService.computeWinner(
        draw.beacon_value,
        draw.merkle_root,
        paidTickets.length,
      );

      const winningTicket = paidTickets[winnerIndex];

      if (!winningTicket) {
        throw new Error(
          `Winning ticket at index ${winnerIndex} not found (total: ${paidTickets.length})`,
        );
      }

      this.logger.log(
        `Winner computed: Ticket #${winningTicket.serial} (index ${winnerIndex}/${paidTickets.length})`,
      );

      // 4. Update draw with winner
      draw.winner_ticket_id = winningTicket.id;
      draw.status = DrawStatus.SETTLED;
      draw.settled_at = new Date();
      await this.drawRepository.save(draw);

      // 5. Update winning ticket status
      winningTicket.status = TicketStatus.ENTERED;
      await this.ticketRepository.save(winningTicket);

      // 6. Create fairness event
      const payload = {
        hash_input: `${draw.beacon_value}||${draw.merkle_root}`,
        hash_output: hash,
        winner_index: winnerIndex,
        winner_ticket_id: winningTicket.id,
        winner_ticket_serial: winningTicket.serial,
        winner_user_id: winningTicket.user_id,
      };

      const fairnessEvent = this.fairnessEventRepository.create({
        draw_id: drawId,
        event_type: FairnessEventType.WINNER_COMPUTED,
        payload,
        payload_hash: this.cryptoService.hashPayload(payload),
      });

      await this.fairnessEventRepository.save(fairnessEvent);

      this.logger.log(
        `Winner computed for draw ${drawId}: Ticket ${winningTicket.serial} (User: ${winningTicket.user_id})`,
      );

      // TODO: Send notification to winner
      // TODO: Export audit bundle to S3
    } catch (error) {
      this.logger.error(
        `Error computing winner for draw ${drawId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
