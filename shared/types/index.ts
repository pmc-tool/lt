// Base Entity Type
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// Enums
export enum UserStatus {
  ACTIVE = 'active',
  SOFT_BANNED = 'soft_banned',
  HARD_BANNED = 'hard_banned',
}

export enum Language {
  EN = 'en',
  BN = 'bn',
}

export enum DrawStatus {
  STARTED = 'started',
  CLOSED = 'closed',
  SETTLED = 'settled',
}

export enum BeaconSource {
  BITCOIN = 'bitcoin',
  DRAND = 'drand',
}

export enum OrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COLLECTED = 'collected',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum TicketStatus {
  RESERVED = 'reserved',
  PAID = 'paid',
  EXPIRED = 'expired',
  ENTERED = 'entered',
}

export enum BanType {
  SOFT = 'soft',
  HARD = 'hard',
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  OPS_MANAGER = 'ops_manager',
  SUPPORT_AGENT = 'support_agent',
  AUDITOR = 'auditor',
}

// DTOs
export interface UserDTO {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  status: UserStatus;
  language: Language;
  created_at: string;
}

export interface DrawDTO {
  id: string;
  title: string;
  status: DrawStatus;
  start_at: string;
  end_at: string;
  ticket_price: number;
  max_tickets: number;
  tickets_sold: number;
  beacon_source: BeaconSource;
  terms_url: string;
}

export interface OrderDTO {
  id: string;
  user_id: string;
  draw_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  expires_at: string;
}

export interface TicketDTO {
  id: string;
  draw_id: string;
  order_id: string;
  user_id: string;
  serial: number;
  status: TicketStatus;
  created_at: string;
}
