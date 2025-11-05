import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Ticket, TicketStatus } from '../database/entities/ticket.entity';
import { CODTask, CODTaskStatus } from '../database/entities/cod-task.entity';
import { Draw, DrawStatus } from '../database/entities/draw.entity';

@Processor('ticket-expiry')
export class TicketExpiryProcessor {
  private readonly logger = new Logger(TicketExpiryProcessor.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(CODTask)
    private codTaskRepository: Repository<CODTask>,
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
  ) {}

  @Process()
  async handleTicketExpiry(job: Job): Promise<void> {
    this.logger.log('Processing ticket expiry job');

    try {
      // Find all expired orders that haven't been processed
      const expiredOrders = await this.orderRepository.find({
        where: {
          expires_at: LessThan(new Date()),
          status: In([OrderStatus.PENDING, OrderStatus.ASSIGNED]),
        },
        relations: ['draw'],
      });

      this.logger.log(`Found ${expiredOrders.length} expired orders`);

      for (const order of expiredOrders) {
        await this.expireOrder(order);
      }

      this.logger.log('Ticket expiry job completed');
    } catch (error) {
      this.logger.error(
        `Error in ticket expiry job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async expireOrder(order: Order): Promise<void> {
    this.logger.log(`Expiring order ${order.id}`);

    try {
      // 1. Update order status to canceled
      order.status = OrderStatus.CANCELED;
      order.canceled_at = new Date();
      order.notes = order.notes
        ? `${order.notes}\nAuto-canceled: Reservation expired`
        : 'Auto-canceled: Reservation expired';
      await this.orderRepository.save(order);

      // 2. Update all tickets to expired
      await this.ticketRepository.update(
        {
          order_id: order.id,
          status: TicketStatus.RESERVED,
        },
        {
          status: TicketStatus.EXPIRED,
          expired_at: new Date(),
        },
      );

      // 3. Update COD task to canceled
      await this.codTaskRepository.update(
        {
          order_id: order.id,
          status: In([
            CODTaskStatus.PENDING,
            CODTaskStatus.ASSIGNED,
            CODTaskStatus.VISITED,
          ]),
        },
        {
          status: CODTaskStatus.CANCELED,
          notes: 'Canceled due to order expiry',
        },
      );

      // 4. Restock tickets if draw is still open
      const draw = await this.drawRepository.findOne({
        where: { id: order.draw_id },
      });

      if (draw && draw.status === DrawStatus.STARTED) {
        // Tickets can be sold again, no action needed
        // The max_tickets limit is enforced when creating new orders
        this.logger.log(
          `Draw ${draw.id} is still open, tickets can be restocked`,
        );
      }

      this.logger.log(`Order ${order.id} expired successfully`);
    } catch (error) {
      this.logger.error(
        `Error expiring order ${order.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
