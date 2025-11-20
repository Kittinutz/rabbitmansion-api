import { PrismaClient, RoomStatus } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting room and room type seed process...');

  try {
    // Clear existing rooms and room types
    console.log('🧹 Clearing existing data...');
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
    const createdRoomTypes: any[] = [];

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
        const sizeMap: { [key: string]: number } = {
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
            (error as Error).message,
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

    // Summary
    const totalRoomTypes = await prisma.roomType.count();
    const totalRooms = await prisma.room.count();

    console.log('📊 Seed Summary:');
    console.log(`   • Room Types: ${totalRoomTypes}`);
    console.log(`   • Rooms: ${totalRooms} (101-117, 201-217, 301-317)`);
    console.log('🎉 Room and room type seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
