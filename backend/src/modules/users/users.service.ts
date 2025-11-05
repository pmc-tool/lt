import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../shared/database/entities/user.entity';
import { Address } from '../../shared/database/entities/address.entity';

export interface UpdateProfileDto {
  name?: string;
  language?: string;
}

export interface CreateAddressDto {
  label?: string;
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.language) {
      user.language = dto.language as any;
    }

    return this.userRepository.save(user);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    // If this is set as default, unset other defaults
    if (dto.is_default) {
      await this.addressRepository.update(
        { user_id: userId, is_default: true },
        { is_default: false },
      );
    }

    const address = this.addressRepository.create({
      user_id: userId,
      ...dto,
    });

    return this.addressRepository.save(address);
  }
}
