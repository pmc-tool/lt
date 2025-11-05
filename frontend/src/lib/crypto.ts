// Client-side cryptographic functions for verification

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function computeWinner(
  beaconValue: string,
  merkleRoot: string,
  totalTickets: number
): Promise<{ hash: string; winnerIndex: number }> {
  const input = beaconValue + merkleRoot;
  const hash = await sha256(input);

  // Convert hex to BigInt
  const hashBigInt = BigInt('0x' + hash);
  const totalTicketsBigInt = BigInt(totalTickets);

  // Compute winner index
  const winnerIndex = Number(hashBigInt % totalTicketsBigInt);

  return { hash, winnerIndex };
}
