import {
  PrismaClient,
  RoomType,
  Room,
  RoomStatus,
  BookingStatus,
  PaymentStatus,
} from './generated/prisma';

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('\n👨‍💼 Seeding admin users...');

  try {
    // Clear existing admins
    await prisma.admin.deleteMany({});

    const admins = [
      {
        email: 'admin@rabbitmansion.com',
        username: 'admin',
        password:
          '$2b$10$rOQTQQGF.VyUfQV7KHjnYu.FGR.VhPAcE7r6TQvT2y5gNJt2mBOuS', // password123
        firstName: 'Hotel',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      {
        email: 'manager@rabbitmansion.com',
        username: 'manager',
        password:
          '$2b$10$rOQTQQGF.VyUfQV7KHjnYu.FGR.VhPAcE7r6TQvT2y5gNJt2mBOuS', // password123
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
    // Clear existing guests and related data
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
        status: GuestStatus.ACTIVE,
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
        status: GuestStatus.VIP,
        vipLevel: 5,
        totalStays: 12,
        totalSpent: 45000,
      },
      {
        email: 'hiroshi.tanaka@example.com',
        phone: '+66-83-456-7890',
        firstName: 'Hiroshi',
        lastName: 'Tanaka',
        dateOfBirth: new Date('1978-11-30'),
        nationality: 'Japanese',
        passport: 'JP456789123',
        address: '789 Shibuya',
        city: 'Tokyo',
        country: 'Japan',
        postalCode: '150-0002',
        preferences: ['Quiet room', 'Traditional breakfast', 'Spa access'],
        status: GuestStatus.ACTIVE,
        vipLevel: 3,
        totalStays: 8,
        totalSpent: 28000,
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
  console.log('\n🏨 Seeding hotel rooms and room types...');

  try {
    // Clear existing rooms and room types
    await prisma.room.deleteMany({});
    await prisma.roomType.deleteMany({});

    // First, create room types
    const roomTypes = [
      {
        code: 'STANDARD_SINGLE',
        name: {
          en: 'Standard Single Room',
          th: 'ห้องเดี่ยวมาตรฐาน',
        },
        description: {
          en: 'Comfortable single room with modern amenities',
          th: 'ห้องเดี่ยวสะดวกสบายพร้อมสิ่งอำนวยความสะดวกทันสมัย',
        },
        basePrice: 1200,
        capacity: 1,
        bedType: 'Single',
        hasPoolView: false,
        amenities: ['WiFi', 'AC', 'TV', 'Desk'],
        isActive: true,
      },
      {
        code: 'STANDARD_DOUBLE',
        name: {
          en: 'Standard Double Room',
          th: 'ห้องดับเบิลมาตรฐาน',
        },
        description: {
          en: 'Spacious double room with queen bed',
          th: 'ห้องดับเบิลขนาดกว้างพร้อมเตียงควีน',
        },
        basePrice: 1800,
        capacity: 2,
        bedType: 'Queen',
        hasPoolView: false,
        amenities: ['WiFi', 'AC', 'TV', 'Minibar', 'Safe'],
        isActive: true,
      },
      {
        code: 'DELUXE_DOUBLE',
        name: {
          en: 'Deluxe Double Room',
          th: 'ห้องดีลักซ์ดับเบิล',
        },
        description: {
          en: 'Premium double room with upgraded amenities',
          th: 'ห้องดับเบิลพรีเมียมพร้อมสิ่งอำนวยความสะดวกระดับพิเศษ',
        },
        basePrice: 2500,
        capacity: 2,
        bedType: 'King',
        hasPoolView: false,
        amenities: [
          'WiFi',
          'AC',
          'TV',
          'Minibar',
          'Safe',
          'Balcony',
          'Bathtub',
        ],
        isActive: true,
      },
      {
        code: 'DELUXE_POOL_VIEW',
        name: {
          en: 'Deluxe Pool View Room',
          th: 'ห้องดีลักซ์วิวสระ',
        },
        description: {
          en: 'Luxurious room with stunning pool views',
          th: 'ห้องหรูหราพร้อมวิวสระสวยงาม',
        },
        basePrice: 3200,
        capacity: 2,
        bedType: 'King',
        hasPoolView: true,
        amenities: [
          'WiFi',
          'AC',
          'TV',
          'Minibar',
          'Safe',
          'Balcony',
          'Bathtub',
          'Pool View',
        ],
        isActive: true,
      },
      {
        code: 'FAMILY_SUITE',
        name: {
          en: 'Family Suite',
          th: 'ห้องสวีทครอบครัว',
        },
        description: {
          en: 'Spacious family suite with separate living area',
          th: 'ห้องสวีทครอบครัวขนาดใหญ่พร้อมพื้นที่นั่งเล่นแยก',
        },
        basePrice: 4500,
        capacity: 4,
        bedType: 'Family',
        hasPoolView: true,
        amenities: [
          'WiFi',
          'AC',
          'TV',
          'Minibar',
          'Safe',
          'Living Area',
          'Kitchenette',
          'Pool View',
        ],
        isActive: true,
      },
    ];

    console.log('📋 Creating room types...');
    const createdRoomTypes: RoomType[] = [];

    for (const roomType of roomTypes) {
      const created = await prisma.roomType.create({
        data: roomType,
      });
      createdRoomTypes.push(created);
      console.log(`✅ Created room type: ${roomType.code}`);
    }

    // Define room distribution by floor
    const roomDistribution = [
      // Floor 1 (101-117): Mix of standard and some deluxe
      {
        floor: 1,
        pattern: [
          'STANDARD_SINGLE',
          'STANDARD_DOUBLE',
          'STANDARD_DOUBLE',
          'DELUXE_DOUBLE',
        ],
      },
      // Floor 2 (201-217): Mix of deluxe and pool view
      {
        floor: 2,
        pattern: [
          'DELUXE_DOUBLE',
          'DELUXE_DOUBLE',
          'DELUXE_POOL_VIEW',
          'DELUXE_POOL_VIEW',
        ],
      },
      // Floor 3 (301-317): Premium rooms with pool view and family suites
      {
        floor: 3,
        pattern: [
          'DELUXE_POOL_VIEW',
          'DELUXE_POOL_VIEW',
          'FAMILY_SUITE',
          'DELUXE_POOL_VIEW',
        ],
      },
    ];

    console.log('🏨 Creating rooms 101-117, 201-217, 301-317...');

    let totalRoomsCreated = 0;

    for (const floorConfig of roomDistribution) {
      const { floor, pattern } = floorConfig;

      for (let roomNum = 1; roomNum <= 17; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;
        const roomTypeCode = pattern[(roomNum - 1) % pattern.length];
        const roomType = createdRoomTypes.find(
          (rt) => rt.code === roomTypeCode,
        );

        if (!roomType) {
          console.error(`❌ Room type ${roomTypeCode} not found`);
          continue;
        }

        // Determine room characteristics based on type and floor
        const isPoolView = roomType.hasPoolView;
        const view = isPoolView
          ? 'Pool'
          : floor === 1
            ? 'Garden'
            : floor === 2
              ? 'City'
              : 'Pool';

        // Calculate pricing with floor premium
        const floorMultiplier = floor === 1 ? 1.0 : floor === 2 ? 1.15 : 1.3;
        const roomPrice = Math.round(roomType.basePrice * floorMultiplier);

        // Determine room size based on type
        const sizeMap = {
          STANDARD_SINGLE: 25,
          STANDARD_DOUBLE: 35,
          DELUXE_DOUBLE: 45,
          DELUXE_POOL_VIEW: 50,
          FAMILY_SUITE: 75,
        };

        const roomData = {
          roomNumber,
          roomTypeId: roomType.id,
          status: RoomStatus.AVAILABLE,
          floor,
          maxOccupancy: roomType.capacity,
          bedCount: roomType.bedType === 'Family' ? 2 : 1,
          bedType: roomType.bedType,
          basePrice: roomPrice,
          seasonalPricing: {
            peak: 1.5,
            high: 1.2,
            low: 0.8,
          },
          size: sizeMap[roomTypeCode] || 35,
          view,
          smokingAllowed: false,
          petFriendly: roomTypeCode === 'FAMILY_SUITE',
          accessible: roomNum <= 3, // First 3 rooms on each floor are accessible
          name: {
            en: `${(roomType.name as any).en} ${roomNumber}`,
            th: `${(roomType.name as any).th} ${roomNumber}`,
          },
          description: {
            en: `${(roomType.description as any).en} located on floor ${floor}`,
            th: `${(roomType.description as any).th} ตั้งอยู่ชั้น ${floor}`,
          },
          amenities: roomType.amenities,
          isActive: true,
        };

        try {
          await prisma.room.create({
            data: roomData,
          });
          totalRoomsCreated++;
          console.log(`✅ Created room: ${roomNumber} (${roomTypeCode})`);
        } catch (error) {
          console.error(
            `❌ Failed to create room ${roomNumber}:`,
            error.message,
          );
        }
      }
    }

    console.log(`✅ Created ${totalRoomsCreated} rooms across 3 floors`);

    // Set some rooms to different statuses for variety
    console.log('🔄 Setting room statuses...');

    // Set some rooms as occupied
    await prisma.room.updateMany({
      where: { roomNumber: { in: ['101', '203', '305', '208', '312'] } },
      data: { status: RoomStatus.OCCUPIED },
    });

    // Set some rooms in maintenance
    await prisma.room.updateMany({
      where: { roomNumber: { in: ['102', '210'] } },
      data: { status: RoomStatus.MAINTENANCE, notes: 'Scheduled maintenance' },
    });

    // Set one room out of order
    await prisma.room.update({
      where: { roomNumber: '307' },
      data: {
        status: RoomStatus.OUT_OF_ORDER,
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
        category: 'ROOM_SERVICE',
        price: 450,
        unit: 'per person',
        maxQuantity: 6,
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        availableFrom: '06:00',
        availableTo: '11:00',
      },
      {
        code: 'SPA_MASSAGE_THAI',
        name: { en: 'Traditional Thai Massage', th: 'นวดแผนไทย' },
        description: {
          en: '60-minute traditional Thai massage therapy',
          th: 'นวดแผนไทยแบบดั้งเดิม 60 นาที',
        },
        category: 'SPA',
        price: 1200,
        unit: 'per session',
        maxQuantity: 2,
        requiresApproval: true,
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        availableFrom: '09:00',
        availableTo: '21:00',
      },
      {
        code: 'TRANSPORT_AIRPORT',
        name: { en: 'Airport Transfer', th: 'บริการรับส่งสนามบิน' },
        description: {
          en: 'Private car transfer to/from airport',
          th: 'บริการรถรับส่งสนามบินแบบส่วนตัว',
        },
        category: 'TRANSPORTATION',
        price: 800,
        unit: 'one way',
        maxQuantity: 1,
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      },
      {
        code: 'LAUNDRY_EXPRESS',
        name: { en: 'Express Laundry Service', th: 'บริการซักรีดด่วน' },
        description: {
          en: 'Same-day laundry service',
          th: 'บริการซักรีดภายในวันเดียว',
        },
        category: 'LAUNDRY',
        price: 50,
        unit: 'per item',
        maxQuantity: 20,
        availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        availableFrom: '08:00',
        availableTo: '16:00',
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

async function seedBookingsAndPayments() {
  console.log('\n📅 Seeding sample bookings and payments...');

  try {
    await prisma.payment.deleteMany({});
    await prisma.booking.deleteMany({});

    const guests = await prisma.guest.findMany();
    const rooms = await prisma.room.findMany({
      where: { status: RoomStatus.OCCUPIED },
    });

    if (guests.length === 0 || rooms.length === 0) {
      console.log(
        '⚠️ No guests or occupied rooms found, skipping booking creation',
      );
      return;
    }

    const bookings = [];
    const today = new Date();

    // Create current bookings for occupied rooms
    for (let i = 0; i < Math.min(rooms.length, guests.length); i++) {
      const guest = guests[i];
      const room = rooms[i];
      const checkInDate = new Date(today);
      checkInDate.setDate(today.getDate() - Math.floor(Math.random() * 3)); // 0-3 days ago
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(
        checkInDate.getDate() + 2 + Math.floor(Math.random() * 3),
      ); // 2-5 days stay

      const numberOfGuests = Math.min(2, room.maxOccupancy);
      const numberOfNights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const roomRate = room.basePrice;
      const totalAmount = roomRate * numberOfNights;

      const booking = {
        bookingNumber: `BK${Date.now()}${i.toString().padStart(3, '0')}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate,
        checkOutDate,
        actualCheckIn: checkInDate,
        numberOfGuests,
        numberOfChildren: 0,
        specialRequests: i === 0 ? 'Late checkout requested' : undefined,
        roomRate,
        totalAmount,
        taxAmount: totalAmount * 0.07, // 7% tax
        serviceCharges: totalAmount * 0.1, // 10% service charge
        discountAmount: guest.vipLevel >= 3 ? totalAmount * 0.1 : 0, // 10% VIP discount
        finalAmount:
          totalAmount +
          totalAmount * 0.17 -
          (guest.vipLevel >= 3 ? totalAmount * 0.1 : 0),
        status: BookingStatus.CHECKED_IN,
        paymentStatus: PaymentStatus.PAID,
        source: 'Website',
        notes: 'Sample booking from seed data',
      };

      bookings.push(booking);
    }

    // Create future bookings
    const availableRooms = await prisma.room.findMany({
      where: { status: RoomStatus.AVAILABLE },
      take: 5,
    });

    for (let i = 0; i < Math.min(availableRooms.length, guests.length); i++) {
      const guest = guests[i % guests.length];
      const room = availableRooms[i];
      const checkInDate = new Date(today);
      checkInDate.setDate(today.getDate() + 1 + Math.floor(Math.random() * 30)); // 1-30 days future
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(
        checkInDate.getDate() + 2 + Math.floor(Math.random() * 5),
      ); // 2-7 days stay

      const numberOfGuests = Math.min(2, room.maxOccupancy);
      const numberOfNights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const roomRate = room.basePrice;
      const totalAmount = roomRate * numberOfNights;

      const booking = {
        bookingNumber: `BK${Date.now()}${(i + 100).toString().padStart(3, '0')}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        numberOfChildren: 0,
        roomRate,
        totalAmount,
        taxAmount: totalAmount * 0.07,
        serviceCharges: totalAmount * 0.1,
        discountAmount: guest.vipLevel >= 3 ? totalAmount * 0.1 : 0,
        finalAmount:
          totalAmount +
          totalAmount * 0.17 -
          (guest.vipLevel >= 3 ? totalAmount * 0.1 : 0),
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
        source: 'Phone',
        notes: 'Future booking from seed data',
      };

      bookings.push(booking);
    }

    // Create bookings in database
    const createdBookings = [];
    for (const bookingData of bookings) {
      const booking = await prisma.booking.create({ data: bookingData });
      createdBookings.push(booking);
    }

    console.log(`✅ Created ${createdBookings.length} sample bookings`);

    // Create payments for bookings
    const payments = [];
    for (const booking of createdBookings) {
      if (booking.paymentStatus === PaymentStatus.PAID) {
        payments.push({
          bookingId: booking.id,
          amount: booking.finalAmount,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.PAID,
          paidAt: booking.actualCheckIn || booking.checkInDate,
          transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          description: 'Full payment for booking',
        });
      } else if (booking.paymentStatus === PaymentStatus.PARTIALLY_PAID) {
        payments.push({
          bookingId: booking.id,
          amount: booking.finalAmount * 0.5, // 50% deposit
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.PAID,
          paidAt: new Date(
            booking.checkInDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          ), // 7 days before check-in
          transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          description: 'Deposit payment for booking',
        });
      }
    }

    for (const paymentData of payments) {
      await prisma.payment.create({ data: paymentData });
    }

    console.log(`✅ Created ${payments.length} sample payments`);
  } catch (error) {
    console.error('❌ Error seeding bookings and payments:', error);
    throw error;
  }
}

async function seedDailyRevenue() {
  console.log('\n📊 Seeding daily revenue data...');

  try {
    await prisma.dailyRevenue.deleteMany({});

    const revenues = [];
    const today = new Date();

    // Generate revenue data for the last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const roomRevenue = 50000 + Math.random() * 100000; // Random between 50k-150k
      const serviceRevenue = 5000 + Math.random() * 20000; // Random between 5k-25k
      const totalRevenue = roomRevenue + serviceRevenue;
      const occupancyRate = 0.6 + Math.random() * 0.35; // Random between 60%-95%
      const totalRooms = 36;
      const adr = roomRevenue / (totalRooms * occupancyRate); // Average Daily Rate
      const revpar = roomRevenue / totalRooms; // Revenue Per Available Room

      revenues.push({
        date,
        roomRevenue,
        serviceRevenue,
        totalRevenue,
        occupancyRate,
        adr,
        revpar,
      });
    }

    for (const revenueData of revenues) {
      await prisma.dailyRevenue.create({ data: revenueData });
    }

    console.log(`✅ Created ${revenues.length} daily revenue records`);
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
      {
        key: 'tax_rate',
        value: 0.07,
        category: 'financial',
      },
      {
        key: 'service_charge_rate',
        value: 0.1,
        category: 'financial',
      },
      {
        key: 'cancellation_policy',
        value: {
          en: '24 hours before check-in for full refund',
          th: 'ยกเลิกก่อน 24 ชั่วโมงจะได้รับเงินคืนเต็มจำนวน',
        },
        category: 'policies',
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
    await seedBookingsAndPayments();
    await seedDailyRevenue();
    await seedSettings();

    console.log(
      '\n🎉 Hotel management database seeding completed successfully!',
    );
    console.log('\n🔗 You can now test the API:');
    console.log('   GET /api/admin/rooms - View all rooms');
    console.log('   GET /api/admin/bookings - View all bookings');
    console.log('   GET /api/admin/guests - View all guests');
    console.log('   GET /api/admin/analytics - View dashboard metrics');
    console.log('\n📊 Database Summary:');
    console.log(`   🏨 Rooms: ${await prisma.room.count()}`);
    console.log(`   👥 Guests: ${await prisma.guest.count()}`);
    console.log(`   📅 Bookings: ${await prisma.booking.count()}`);
    console.log(`   💳 Payments: ${await prisma.payment.count()}`);
    console.log(`   🛎️ Services: ${await prisma.service.count()}`);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Seeding interrupted');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Seeding terminated');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the seed script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export {
  main as seedDatabase,
  seedAdmin,
  seedGuests,
  seedRooms,
  seedServices,
  seedBookingsAndPayments,
};
