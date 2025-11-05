import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { MerkleTree } from 'merkletreejs';

export interface TicketLeaf {
  drawId: string;
  serial: number;
  userId: string;
}

@Injectable()
export class CryptoService {
  /**
   * Generate SHA256 hash of input string
   */
  sha256(input: string): string {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /**
   * Generate SHA256 hash of buffer
   */
  sha256Buffer(input: Buffer): Buffer {
    return crypto.createHash('sha256').update(input).digest();
  }

  /**
   * Compute leaf hash for a ticket
   * Formula: SHA256(draw_id || serial || user_id)
   */
  computeTicketLeafHash(ticket: TicketLeaf): string {
    const input = `${ticket.drawId}||${ticket.serial}||${ticket.userId}`;
    return this.sha256(input);
  }

  /**
   * Build Merkle tree from ticket leaf hashes
   * Returns the root hash (hex) and the Merkle tree instance
   */
  buildMerkleTree(leafHashes: string[]): {
    root: string;
    tree: MerkleTree;
    totalLeaves: number;
  } {
    if (leafHashes.length === 0) {
      throw new Error('Cannot build Merkle tree with zero leaves');
    }

    // Convert hex strings to buffers for merkletreejs
    const leaves = leafHashes.map((hash) => Buffer.from(hash, 'hex'));

    // Build tree using SHA256
    const tree = new MerkleTree(leaves, this.sha256Buffer, {
      sortPairs: true,
    });

    const root = tree.getRoot().toString('hex');

    return {
      root,
      tree,
      totalLeaves: leafHashes.length,
    };
  }

  /**
   * Generate Merkle proof for a specific leaf
   */
  generateProof(tree: MerkleTree, leafHash: string): string[] {
    const leaf = Buffer.from(leafHash, 'hex');
    const proof = tree.getProof(leaf);

    return proof.map((item) => ({
      position: item.position === 'right' ? 'right' : 'left',
      data: item.data.toString('hex'),
    })) as any;
  }

  /**
   * Verify a Merkle proof against a root
   */
  verifyProof(
    proof: Array<{ position: string; data: string }>,
    leafHash: string,
    root: string,
  ): boolean {
    const leaf = Buffer.from(leafHash, 'hex');
    const rootBuffer = Buffer.from(root, 'hex');

    // Convert proof format
    const proofBuffers = proof.map((item) => ({
      position: item.position as 'left' | 'right',
      data: Buffer.from(item.data, 'hex'),
    }));

    return MerkleTree.verify(proofBuffers, leaf, rootBuffer, this.sha256Buffer);
  }

  /**
   * Compute winner from beacon value and merkle root
   * Formula: SHA256(beacon_value || merkle_root) % total_tickets
   */
  computeWinner(
    beaconValue: string,
    merkleRoot: string,
    totalTickets: number,
  ): {
    hash: string;
    winnerIndex: number;
  } {
    if (totalTickets <= 0) {
      throw new Error('Total tickets must be greater than zero');
    }

    // Concatenate beacon and merkle root
    const input = beaconValue + merkleRoot;
    const hash = this.sha256(input);

    // Convert hash to bigint and compute modulo
    const hashBigInt = BigInt('0x' + hash);
    const winnerIndex = Number(hashBigInt % BigInt(totalTickets));

    return {
      hash,
      winnerIndex,
    };
  }

  /**
   * Hash a payload object for audit purposes
   * Returns SHA256 hash of JSON stringified payload
   */
  hashPayload(payload: any): string {
    const jsonString = JSON.stringify(payload, null, 0);
    return this.sha256(jsonString);
  }
}
