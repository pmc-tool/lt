import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw, DrawStatus } from '../../shared/database/entities/draw.entity';
import { Ticket, TicketStatus } from '../../shared/database/entities/ticket.entity';
import { FairnessEvent } from '../../shared/database/entities/fairness-event.entity';
import { CryptoService } from '../../shared/crypto/crypto.service';

export interface VerificationData {
  draw_id: string;
  draw_title: string;
  status: DrawStatus;
  merkle_root: string | null;
  beacon_value: string | null;
  beacon_source: string;
  total_tickets: number;
  winner_ticket_id: string | null;
  winner_serial: number | null;
  winner_user_id: string | null;
  verification_formula: string;
  fairness_events: Array<{
    event_type: string;
    payload: any;
    created_at: Date;
  }>;
  can_verify: boolean;
}

@Injectable()
export class FairnessService {
  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(FairnessEvent)
    private fairnessEventRepository: Repository<FairnessEvent>,
    private cryptoService: CryptoService,
  ) {}

  async getVerificationData(drawId: string): Promise<VerificationData> {
    const draw = await this.drawRepository.findOne({ where: { id: drawId } });

    if (!draw) {
      throw new NotFoundException('Draw not found');
    }

    // Get winner ticket if exists
    let winnerTicket = null;
    if (draw.winner_ticket_id) {
      winnerTicket = await this.ticketRepository.findOne({
        where: { id: draw.winner_ticket_id },
      });
    }

    // Get fairness events
    const events = await this.fairnessEventRepository.find({
      where: { draw_id: drawId },
      order: { created_at: 'ASC' },
    });

    // Get total paid tickets count for verification
    const paidTicketsCount = await this.ticketRepository.count({
      where: {
        draw_id: drawId,
        status: TicketStatus.PAID,
      },
    });

    const canVerify = draw.status === DrawStatus.SETTLED && !!draw.merkle_root && !!draw.beacon_value;

    return {
      draw_id: draw.id,
      draw_title: draw.title,
      status: draw.status,
      merkle_root: draw.merkle_root,
      beacon_value: draw.beacon_value,
      beacon_source: draw.beacon_source,
      total_tickets: paidTicketsCount,
      winner_ticket_id: draw.winner_ticket_id,
      winner_serial: winnerTicket?.serial || null,
      winner_user_id: winnerTicket?.user_id || null,
      verification_formula: 'hash = SHA256(beacon_value + merkle_root); winner_index = bigint(hash) % total_tickets',
      fairness_events: events.map((e) => ({
        event_type: e.event_type,
        payload: e.payload,
        created_at: e.created_at,
      })),
      can_verify: canVerify,
    };
  }

  async verifyDrawResult(drawId: string): Promise<{
    is_valid: boolean;
    computed_hash: string;
    computed_winner_index: number;
    expected_winner_serial: number | null;
    actual_winner_serial: number | null;
    matches: boolean;
  }> {
    const verificationData = await this.getVerificationData(drawId);

    if (!verificationData.can_verify) {
      throw new NotFoundException('Draw not settled or missing verification data');
    }

    // Recompute winner
    const { hash, winnerIndex } = this.cryptoService.computeWinner(
      verificationData.beacon_value!,
      verificationData.merkle_root!,
      verificationData.total_tickets,
    );

    // Get the ticket at winnerIndex position
    const tickets = await this.ticketRepository.find({
      where: {
        draw_id: drawId,
        status: TicketStatus.PAID,
      },
      order: { serial: 'ASC' },
    });

    const expectedWinnerTicket = tickets[winnerIndex];
    const expectedSerial = expectedWinnerTicket?.serial || null;

    return {
      is_valid: true,
      computed_hash: hash,
      computed_winner_index: winnerIndex,
      expected_winner_serial: expectedSerial,
      actual_winner_serial: verificationData.winner_serial,
      matches: expectedSerial === verificationData.winner_serial,
    };
  }

  async getTicketProof(ticketId: string): Promise<{
    ticket: any;
    merkle_proof: string[];
    draw_merkle_root: string;
    can_verify: boolean;
  }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['draw'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const draw = await this.drawRepository.findOne({ where: { id: ticket.draw_id } });

    if (!draw || !draw.merkle_root) {
      return {
        ticket: {
          id: ticket.id,
          serial: ticket.serial,
          status: ticket.status,
          leaf_hash: ticket.leaf_hash,
        },
        merkle_proof: [],
        draw_merkle_root: draw?.merkle_root || '',
        can_verify: false,
      };
    }

    // Get all paid tickets to rebuild tree
    const paidTickets = await this.ticketRepository.find({
      where: {
        draw_id: ticket.draw_id,
        status: TicketStatus.PAID,
      },
      order: { serial: 'ASC' },
    });

    const leafHashes = paidTickets.map((t) => t.leaf_hash!);
    const { tree } = this.cryptoService.buildMerkleTree(leafHashes);

    const ticketLeafBuffer = Buffer.from(ticket.leaf_hash!, 'hex');
    const proof = tree.getHexProof(ticketLeafBuffer);

    return {
      ticket: {
        id: ticket.id,
        serial: ticket.serial,
        status: ticket.status,
        leaf_hash: ticket.leaf_hash,
      },
      merkle_proof: proof,
      draw_merkle_root: draw.merkle_root,
      can_verify: true,
    };
  }
}
