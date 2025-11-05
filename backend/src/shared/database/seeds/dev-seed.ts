import { AppDataSource } from '../data-source';
import { User, UserStatus, Language } from '../entities/user.entity';
import { Draw, DrawStatus, BeaconSource } from '../entities/draw.entity';
import { Address } from '../entities/address.entity';

async function seed() {
  console.log('🌱 Seeding development database...');

  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);
  const addressRepository = AppDataSource.getRepository(Address);
  const drawRepository = AppDataSource.getRepository(Draw);

  // Create test users
  console.log('Creating test users...');

  const user1 = userRepository.create({
    phone: '+8801700000001',
    email: 'test1@lottery.com',
    name: 'Test User 1',
    status: UserStatus.ACTIVE,
    language: Language.EN,
  });

  const user2 = userRepository.create({
    phone: '+8801700000002',
    email: 'test2@lottery.com',
    name: 'Test User 2',
    status: UserStatus.ACTIVE,
    language: Language.BN,
  });

  const user3 = userRepository.create({
    phone: '+8801700000003',
    email: 'admin@lottery.com',
    name: 'Admin User',
    status: UserStatus.ACTIVE,
    language: Language.EN,
  });

  await userRepository.save([user1, user2, user3]);
  console.log('✅ Created 3 test users');

  // Create addresses
  console.log('Creating test addresses...');

  const address1 = addressRepository.create({
    user_id: user1.id,
    label: 'Home',
    street: '123 Main Street',
    city: 'Dhaka',
    state: 'Dhaka Division',
    postal_code: '1000',
    country: 'BD',
    phone: '+8801700000001',
    is_default: true,
  });

  const address2 = addressRepository.create({
    user_id: user2.id,
    label: 'Home',
    street: '456 Park Avenue',
    city: 'Chittagong',
    state: 'Chittagong Division',
    postal_code: '4000',
    country: 'BD',
    phone: '+8801700000002',
    is_default: true,
  });

  await addressRepository.save([address1, address2]);
  console.log('✅ Created 2 test addresses');

  // Create test draws
  console.log('Creating test draws...');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const draw1 = drawRepository.create({
    title: 'Weekly Draw #1',
    status: DrawStatus.STARTED,
    start_at: now,
    end_at: tomorrow,
    ticket_price: 100,
    max_tickets: 1000,
    tickets_sold: 0,
    low_sales_threshold_pct: 30,
    beacon_source: BeaconSource.BITCOIN,
    beacon_rule: 'Bitcoin block hash at height N after close',
    terms_url: 'https://lottery.example.com/terms',
    created_by: user3.id,
  });

  const draw2 = drawRepository.create({
    title: 'Monthly Mega Draw',
    status: DrawStatus.STARTED,
    start_at: now,
    end_at: nextWeek,
    ticket_price: 500,
    max_tickets: 5000,
    tickets_sold: 0,
    low_sales_threshold_pct: 30,
    beacon_source: BeaconSource.DRAND,
    beacon_rule: 'Drand beacon at time of settlement',
    terms_url: 'https://lottery.example.com/terms',
    created_by: user3.id,
  });

  await drawRepository.save([draw1, draw2]);
  console.log('✅ Created 2 test draws');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('User 1: +8801700000001 / test1@lottery.com');
  console.log('User 2: +8801700000002 / test2@lottery.com');
  console.log('Admin: +8801700000003 / admin@lottery.com');
  console.log('\nIn OTP_TEST_MODE, use code: 123456');

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
