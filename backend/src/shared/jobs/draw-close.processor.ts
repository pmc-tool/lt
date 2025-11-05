import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw, DrawStatus } from '../database/entities/draw.entity';
import { Ticket, TicketStatus } from '../database/entities/ticket.entity';
import { CryptoService } from '../crypto/crypto.service';
import {
  FairnessEvent,
  FairnessEventType,
} from '../database/entities/fairness-event.entity';

export interface DrawCloseJobData {
  drawId: string;
}

@Processor('draw-close')
export class DrawCloseProcessor {
  private readonly logger = new Logger(DrawCloseProcessor.name);

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
  async handleDrawClose(job: Job<DrawCloseJobData>): Promise<void> {
    const { drawId } = job.data;
    this.logger.log(`Processing draw close for draw ${drawId}`);

    try {
      // 1. Find the draw
      const draw = await this.drawRepository.findOne({ where: { id: drawId } });

      if (!draw) {
        throw new Error(`Draw ${drawId} not found`);
      }

      if (draw.status !== DrawStatus.STARTED) {
        this.logger.warn(
          `Draw ${drawId} is not in STARTED status, skipping close`,
        );
        return;
      }

      // 2. Get all paid tickets ordered by serial
      const paidTickets = await this.ticketRepository.find({
        where: {
          draw_id: drawId,
          status: TicketStatus.PAID,
        },
        order: {
          serial: 'ASC',
        },
      });

      this.logger.log(
        `Found ${paidTickets.length} paid tickets for draw ${drawId}`,
      );

      // Check low sales threshold
      const sellThroughPct =
        (paidTickets.length / draw.max_tickets) * 100;
      if (sellThroughPct < draw.low_sales_threshold_pct) {
        this.logger.warn(
          `Draw ${drawId} did not meet low sales threshold (${sellThroughPct.toFixed(1)}% < ${draw.low_sales_threshold_pct}%). Marking as canceled.`,
        );

        draw.status = DrawStatus.CLOSED;
        draw.closed_at = new Date();
        await this.drawRepository.save(draw);

        // TODO: Trigger refund job for all orders
        return;
      }

      if (paidTickets.length === 0) {
        throw new Error(`No paid tickets found for draw ${drawId}`);
      }

      // 3. Compute leaf hashes if not already computed
      for (const ticket of paidTickets) {
        if (!ticket.leaf_hash) {
          ticket.leaf_hash = this.cryptoService.computeTicketLeafHash({
            drawId: ticket.draw_id,
            serial: ticket.serial,
            userId: ticket.user_id,
          });
        }
      }

      // Save updated tickets
      await this.ticketRepository.save(paidTickets);

      // 4. Build Merkle tree
      const leafHashes = paidTickets.map((t) => t.leaf_hash!);
      const { root, totalLeaves } =
        this.cryptoService.buildMerkleTree(leafHashes);

      this.logger.log(
        `Built Merkle tree with root: ${root} (${totalLeaves} leaves)`,
      );

      // 5. Update draw with merkle root
      draw.merkle_root = root;
      draw.status = DrawStatus.CLOSED;
      draw.closed_at = new Date();
      await this.drawRepository.save(draw);

      // 6. Create fairness event
      const payload = {
        merkle_root: root,
        total_paid_tickets: totalLeaves,
        leaf_hashes: leafHashes,
        merkle_tree_depth: Math.ceil(Math.log2(totalLeaves)),
      };

      const fairnessEvent = this.fairnessEventRepository.create({
        draw_id: drawId,
        event_type: FairnessEventType.MERKLE_PUBLISHED,
        payload,
        payload_hash: this.cryptoService.hashPayload(payload),
      });

      await this.fairnessEventRepository.save(fairnessEvent);

      this.logger.log(
        `Draw ${drawId} closed successfully. Merkle root: ${root}`,
      );

      // TODO: Queue beacon fetch job
    } catch (error) {
      this.logger.error(
        `Error processing draw close for ${drawId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
