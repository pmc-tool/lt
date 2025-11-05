import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draw, BeaconSource } from '../database/entities/draw.entity';
import {
  FairnessEvent,
  FairnessEventType,
} from '../database/entities/fairness-event.entity';
import { CryptoService } from '../crypto/crypto.service';

export interface BeaconFetchJobData {
  drawId: string;
  retryCount?: number;
}

@Processor('beacon-fetch')
export class BeaconFetchProcessor {
  private readonly logger = new Logger(BeaconFetchProcessor.name);
  private readonly MAX_RETRIES = 288; // 24 hours / 5 min = 288 retries

  constructor(
    @InjectRepository(Draw)
    private drawRepository: Repository<Draw>,
    @InjectRepository(FairnessEvent)
    private fairnessEventRepository: Repository<FairnessEvent>,
    private cryptoService: CryptoService,
  ) {}

  @Process()
  async handleBeaconFetch(job: Job<BeaconFetchJobData>): Promise<void> {
    const { drawId, retryCount = 0 } = job.data;
    this.logger.log(
      `Fetching beacon for draw ${drawId} (attempt ${retryCount + 1}/${this.MAX_RETRIES})`,
    );

    try {
      const draw = await this.drawRepository.findOne({ where: { id: drawId } });

      if (!draw) {
        throw new Error(`Draw ${drawId} not found`);
      }

      if (draw.beacon_value) {
        this.logger.warn(`Draw ${drawId} already has a beacon value, skipping`);
        return;
      }

      let beaconValue: string;
      let beaconUrl: string;

      if (draw.beacon_source === BeaconSource.BITCOIN) {
        const result = await this.fetchBitcoinBeacon(draw);
        if (!result) {
          // Block not yet mined, retry
          if (retryCount < this.MAX_RETRIES) {
            throw new Error(
              `Bitcoin block not yet available, will retry (${retryCount + 1}/${this.MAX_RETRIES})`,
            );
          } else {
            // Fallback to drand after 24 hours
            this.logger.warn(
              `Bitcoin beacon not available after 24 hours, falling back to drand`,
            );
            const drandResult = await this.fetchDrandBeacon();
            beaconValue = drandResult.beaconValue;
            beaconUrl = drandResult.beaconUrl;
          }
        } else {
          beaconValue = result.beaconValue;
          beaconUrl = result.beaconUrl;
        }
      } else {
        const result = await this.fetchDrandBeacon();
        beaconValue = result.beaconValue;
        beaconUrl = result.beaconUrl;
      }

      // Update draw with beacon value
      draw.beacon_value = beaconValue;
      await this.drawRepository.save(draw);

      // Create fairness event
      const payload = {
        beacon_source: draw.beacon_source,
        beacon_value: beaconValue,
        beacon_url: beaconUrl,
        fetched_at: new Date().toISOString(),
      };

      const fairnessEvent = this.fairnessEventRepository.create({
        draw_id: drawId,
        event_type: FairnessEventType.BEACON_FETCHED,
        payload,
        payload_hash: this.cryptoService.hashPayload(payload),
      });

      await this.fairnessEventRepository.save(fairnessEvent);

      this.logger.log(
        `Beacon fetched for draw ${drawId}: ${beaconValue.substring(0, 16)}...`,
      );

      // TODO: Queue winner compute job
    } catch (error) {
      this.logger.error(
        `Error fetching beacon for draw ${drawId}: ${error.message}`,
      );

      // Retry after 5 minutes
      if (retryCount < this.MAX_RETRIES) {
        throw error; // BullMQ will retry
      }
    }
  }

  private async fetchBitcoinBeacon(
    draw: Draw,
  ): Promise<{ beaconValue: string; beaconUrl: string } | null> {
    try {
      // Calculate expected block height
      const drawCloseTime = draw.closed_at?.getTime() || Date.now();
      const avgBlockTime = 10 * 60 * 1000; // 10 minutes in ms
      const blocksSinceEpoch = Math.floor(drawCloseTime / avgBlockTime);

      // Bitcoin genesis block was at height 0 on 2009-01-03
      const genesisTime = new Date('2009-01-03').getTime();
      const blockHeight = Math.floor(
        (drawCloseTime - genesisTime) / avgBlockTime,
      );

      const url = `https://blockchain.info/block-height/${blockHeight}?format=json`;

      this.logger.log(
        `Fetching Bitcoin block at height ${blockHeight} from ${url}`,
      );

      const response = await fetch(url);

      if (response.status === 404) {
        this.logger.log(`Block ${blockHeight} not yet mined`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.blocks || data.blocks.length === 0) {
        return null;
      }

      const blockHash = data.blocks[0].hash;

      return {
        beaconValue: blockHash,
        beaconUrl: `https://blockchain.info/block-height/${blockHeight}`,
      };
    } catch (error) {
      this.logger.error(`Error fetching Bitcoin beacon: ${error.message}`);
      throw error;
    }
  }

  private async fetchDrandBeacon(): Promise<{
    beaconValue: string;
    beaconUrl: string;
  }> {
    try {
      const url = 'https://drand.cloudflare.com/public/latest';
      this.logger.log(`Fetching drand beacon from ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        beaconValue: data.randomness,
        beaconUrl: `https://drand.love/public/${data.round}`,
      };
    } catch (error) {
      this.logger.error(`Error fetching drand beacon: ${error.message}`);
      throw error;
    }
  }
}
