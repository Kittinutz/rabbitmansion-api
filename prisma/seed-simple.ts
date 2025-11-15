import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('\n👨‍💼 Seeding admin users...');

  try {
    await prisma.admin.deleteMany({});

    const admins = [
      {
        email: 'admin@rabbitmansion.com',
        username: 'admin',
        password:
          '$2b$10$rOQTQQGF.VyUfQV7KHjnYu.FGR.VhPAcE7r6TQvT2y5gNJt2mBOuS',
        firstName: 'Hotel',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      {
        email: 'manager@rabbitmansion.com',
        username: 'manager',
        password:
          '$2b$10$rOQTQQGF.VyUfQV7KHjnYu.FGR.VhPAcE7r6TQvT2y5gNJt2mBOuS',
        firstName: 'Hotel',
        lastName: 'Manager',
        role: 'MANAGER',
        isActive: true,
      },
    ];

    for (const adminData of admins) {
      await prisma.admin.create({ data: adminData });
    }

    console.log(`✅ Created ${admins.length} admin users`);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    throw error;
  }
}

async function seedGuests() {
  console.log('\n👥 Seeding sample guests...');

  try {
    await prisma.guest.deleteMany({});

    const guests = [
      {
        email: 'john.smith@example.com',
        phone: '+66-81-234-5678',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-03-15'),
        nationality: 'American',
        passport: 'US123456789',
        address: '123 Main Street',
        city: 'New York',
        country: 'United States',
        postalCode: '10001',
        preferences: ['Non-smoking', 'High floor', 'City view'],
        status: 'ACTIVE' as const,
        vipLevel: 2,
        totalStays: 5,
        totalSpent: 15000,
      },
      {
        email: 'jane.doe@example.com',
        phone: '+66-82-345-6789',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-07-22'),
        nationality: 'British',
        passport: 'UK987654321',
        address: '456 Queen Street',
        city: 'London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        preferences: ['Room service', 'Late checkout', 'Pool access'],
        status: 'VIP' as const,
        vipLevel: 5,
        totalStays: 12,
        totalSpent: 45000,
      },
    ];

    for (const guestData of guests) {
      await prisma.guest.create({ data: guestData });
    }

    console.log(`✅ Created ${guests.length} sample guests`);
  } catch (error) {
    console.error('❌ Error seeding guests:', error);
    throw error;
  }
}

async function seedRooms() {
  console.log('\n🏨 Seeding hotel rooms...');

  try {
    await prisma.room.deleteMany({});

    const roomData = [
      // Standard rooms (Floor 1: 101-112)
      ...Array.from({ length: 12 }, (_, i) => ({
        roomNumber: `1${(i + 1).toString().padStart(2, '0')}`,
        roomType: 'STANDARD' as const,
        status: 'AVAILABLE' as const,
        floor: 1,
        maxOccupancy: 2,
        bedCount: 1,
        bedType: 'Queen',
        basePrice: 2500,
        seasonalPricing: { high: 3750, peak: 5000, low: 2000 },
        size: 25,
        view: 'Courtyard View',
        smokingAllowed: false,
        petFriendly: true,
        accessible: i < 2,
        name: { en: 'Standard Room', th: 'ห้องมาตรฐาน' },
        description: {
          en: 'Comfortable standard room with modern amenities',
          th: 'ห้องพักมาตรฐานที่สะดวกสบายพร้อมสิ่งอำนวยความสะดวกทันสมัย',
        },
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'Mini Fridge',
        ],
        isActive: true,
      })),
      // Deluxe rooms (Floor 2: 201-212)
      ...Array.from({ length: 12 }, (_, i) => ({
        roomNumber: `2${(i + 1).toString().padStart(2, '0')}`,
        roomType: 'DELUXE' as const,
        status: 'AVAILABLE' as const,
        floor: 2,
        maxOccupancy: 3,
        bedCount: 1,
        bedType: 'King',
        basePrice: 3500,
        seasonalPricing: { high: 5250, peak: 7000, low: 2800 },
        size: 35,
        view: 'Garden View',
        smokingAllowed: false,
        petFriendly: false,
        accessible: false,
        name: { en: 'Deluxe Room', th: 'ห้องดีลักซ์' },
        description: {
          en: 'Spacious deluxe room with premium amenities and city view',
          th: 'ห้องดีลักซ์กว้างขวางพร้อมสิ่งอำนวยความสะดวกระดับพรีเมียมและวิวเมือง',
        },
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'Mini Fridge',
          'City View',
          'Room Service',
          'Safe Box',
        ],
        isActive: true,
      })),
      // Suite rooms (Floor 3: 301-312)
      ...Array.from({ length: 12 }, (_, i) => ({
        roomNumber: `3${(i + 1).toString().padStart(2, '0')}`,
        roomType: 'SUITE' as const,
        status: 'AVAILABLE' as const,
        floor: 3,
        maxOccupancy: 4,
        bedCount: 2,
        bedType: 'King + Sofa Bed',
        basePrice: 5500,
        seasonalPricing: { high: 8250, peak: 11000, low: 4400 },
        size: 50,
        view: 'City View',
        smokingAllowed: false,
        petFriendly: false,
        accessible: false,
        name: { en: 'Executive Suite', th: 'ห้องสวีทเอ็กเซ็กคิวทีฟ' },
        description: {
          en: 'Luxurious suite with separate living area and premium facilities',
          th: 'ห้องสวีทหรูหราพร้อมพื้นที่นั่งเล่นแยกและสิ่งอำนวยความสะดวกระดับพรีเมียม',
        },
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'Mini Bar',
          'Living Area',
          'City View',
          'Room Service',
          'Safe Box',
          'Balcony',
        ],
        isActive: true,
      })),
    ];

    for (const room of roomData) {
      await prisma.room.create({ data: room });
    }

    console.log(`✅ Created ${roomData.length} rooms across 3 floors`);

    // Update some room statuses for variety
    await prisma.room.updateMany({
      where: { roomNumber: { in: ['101', '203', '305', '208', '312'] } },
      data: { status: 'OCCUPIED' },
    });

    await prisma.room.updateMany({
      where: { roomNumber: { in: ['102', '210'] } },
      data: { status: 'MAINTENANCE', notes: 'Scheduled maintenance' },
    });

    await prisma.room.update({
      where: { roomNumber: '307' },
      data: {
        status: 'OUT_OF_ORDER',
        notes: 'Air conditioning unit needs replacement',
      },
    });

    console.log('✅ Updated room statuses for variety');
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    throw error;
  }
}

async function seedServices() {
  console.log('\n🛎️ Seeding hotel services...');

  try {
    await prisma.service.deleteMany({});

    const services = [
      {
        code: 'ROOM_SERVICE_BREAKFAST',
        name: { en: 'Room Service Breakfast', th: 'บริการอาหารเช้าในห้องพัก' },
        description: {
          en: 'Continental breakfast delivered to your room',
          th: 'อาหารเช้าคอนติเนนตัลส่งถึงห้องพัก',
        },
        category: 'ROOM_SERVICE' as const,
        basePrice: 450,
        maxQuantity: 6,
      },
      {
        code: 'SPA_MASSAGE_THAI',
        name: { en: 'Traditional Thai Massage', th: 'นวดแผนไทย' },
        description: {
          en: '60-minute traditional Thai massage therapy',
          th: 'นวดแผนไทยแบบดั้งเดิม 60 นาที',
        },
        category: 'SPA' as const,
        basePrice: 1200,
        maxQuantity: 2,
        requiresApproval: true,
      },
      {
        code: 'TRANSPORT_AIRPORT',
        name: { en: 'Airport Transfer', th: 'บริการรับส่งสนามบิน' },
        description: {
          en: 'Private car transfer to/from airport',
          th: 'บริการรถรับส่งสนามบินแบบส่วนตัว',
        },
        category: 'TRANSPORTATION' as const,
        basePrice: 800,
        maxQuantity: 1,
      },
    ];

    for (const serviceData of services) {
      await prisma.service.create({ data: serviceData });
    }

    console.log(`✅ Created ${services.length} hotel services`);
  } catch (error) {
    console.error('❌ Error seeding services:', error);
    throw error;
  }
}

async function seedDailyRevenue() {
  console.log('\n📊 Seeding daily revenue data...');

  try {
    await prisma.dailyRevenue.deleteMany({});

    const today = new Date();

    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const roomRevenue = 50000 + Math.random() * 100000;
      const serviceRevenue = 5000 + Math.random() * 20000;
      const totalRevenue = roomRevenue + serviceRevenue;
      const occupancyRate = 0.6 + Math.random() * 0.35;
      const totalRooms = 36;
      const adr = roomRevenue / (totalRooms * occupancyRate);
      const revpar = roomRevenue / totalRooms;

      await prisma.dailyRevenue.create({
        data: {
          date,
          roomRevenue,
          serviceRevenue,
          totalRevenue,
          occupancyRate,
          adr,
          revpar,
        },
      });
    }

    console.log(`✅ Created 31 daily revenue records`);
  } catch (error) {
    console.error('❌ Error seeding daily revenue:', error);
    throw error;
  }
}

async function seedSettings() {
  console.log('\n⚙️ Seeding system settings...');

  try {
    await prisma.settings.deleteMany({});

    const settings = [
      {
        key: 'hotel_name',
        value: { en: 'Rabbit Mansion Hotel', th: 'โรงแรมแรบบิท แมนชั่น' },
        category: 'general',
      },
      {
        key: 'check_in_time',
        value: '14:00',
        category: 'operations',
      },
      {
        key: 'check_out_time',
        value: '12:00',
        category: 'operations',
      },
      {
        key: 'default_currency',
        value: 'THB',
        category: 'financial',
      },
    ];

    for (const settingData of settings) {
      await prisma.settings.create({ data: settingData });
    }

    console.log(`✅ Created ${settings.length} system settings`);
  } catch (error) {
    console.error('❌ Error seeding settings:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting hotel management database seeding...');

  try {
    await seedAdmin();
    await seedGuests();
    await seedRooms();
    await seedServices();
    await seedDailyRevenue();
    await seedSettings();

    console.log(
      '\n🎉 Hotel management database seeding completed successfully!',
    );
    console.log('\n📊 Database Summary:');
    console.log(`   🏨 Rooms: ${await prisma.room.count()}`);
    console.log(`   👥 Guests: ${await prisma.guest.count()}`);
    console.log(`   👨‍💼 Admins: ${await prisma.admin.count()}`);
    console.log(`   🛎️ Services: ${await prisma.service.count()}`);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { main as seedDatabase };
