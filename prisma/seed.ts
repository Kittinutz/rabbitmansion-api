import { AmenitiesEnum } from 'types/roomType.type';
import { PrismaClient, RoomType, RoomStatus } from '../generated/prisma';

const prisma = new PrismaClient();

interface RoomData {
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  status: RoomStatus;
  price: number;
  description: string;
  amenities: string[];
}

function getDefaultAmenities(roomType: RoomType): string[] {
  const baseAmenities = Object.keys(AmenitiesEnum);
  switch (roomType) {
    case 'STANDARD_OPPOSITE_POOL':
      return [...baseAmenities];
    case 'DOUBLE_BED':
      return [...baseAmenities];
    case 'SUPERIOR':
      return [
        ...baseAmenities,
        'King Size Bed',
        'Mini Fridge',
        'City View',
        'Room Service',
        'Safe Box',
      ];
    default:
      return baseAmenities;
  }
}

function getDefaultPrice(roomType: RoomType): number {
  switch (roomType) {
    case 'STANDARD_OPPOSITE_POOL':
      return 2500;
    case 'DOUBLE_BED':
      return 3000;
    case 'SUPERIOR':
      return 4000;
    default:
      return 2500;
  }
}

function getDescription(roomType: RoomType, roomNumber: string): string {
  switch (roomType) {
    case 'STANDARD_OPPOSITE_POOL':
      return `Standard room with pool view. Comfortable accommodation with essential amenities for leisure travelers.`;
    case 'DOUBLE_BED':
      return `Double bed room with premium king-size bed. Spacious and comfortable for couples and business travelers.`;
    case 'SUPERIOR':
      return `Superior luxury room with city view. Premium accommodation with enhanced amenities and VIP service.`;
    default:
      return `Standard accommodation room ${roomNumber}.`;
  }
}

async function generateRoomsData(): Promise<RoomData[]> {
  const rooms: RoomData[] = [];

  // Generate room numbers for floors 1, 2, 3 (1xx, 2xx, 3xx where xx = 01-12)
  for (let floor = 1; floor <= 3; floor++) {
    for (let roomNum = 1; roomNum <= 12; roomNum++) {
      const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;

      // Assign room types based on floor
      let roomType: RoomType;
      if (floor === 1) {
        roomType = 'STANDARD_OPPOSITE_POOL';
      } else if (floor === 2) {
        roomType = 'DOUBLE_BED';
      } else {
        roomType = 'SUPERIOR';
      }

      rooms.push({
        roomNumber,
        roomType,
        floor,
        status: 'AVAILABLE',
        price: getDefaultPrice(roomType),
        description: getDescription(roomType, roomNumber),
        amenities: getDefaultAmenities(roomType),
      });
    }
  }

  return rooms;
}

async function seedRooms() {
  console.log('🌱 Starting room seeding...');

  try {
    // Clear existing rooms
    console.log('🧹 Clearing existing rooms...');
    await prisma.room.deleteMany({});
    console.log('✅ Existing rooms cleared');

    // Generate room data
    const roomsData = await generateRoomsData();
    console.log(`📋 Generated ${roomsData.length} room records`);

    // Create rooms
    console.log('🏨 Creating rooms...');
    let createdCount = 0;

    for (const roomData of roomsData) {
      await prisma.room.create({
        data: roomData,
      });
      createdCount++;

      if (createdCount % 10 === 0) {
        console.log(`   📍 Created ${createdCount} rooms...`);
      }
    }

    console.log(`✅ Successfully created ${createdCount} rooms`);

    // Display summary
    const roomCounts = await Promise.all([
      prisma.room.count({ where: { roomType: 'STANDARD_OPPOSITE_POOL' } }),
      prisma.room.count({ where: { roomType: 'DOUBLE_BED' } }),
      prisma.room.count({ where: { roomType: 'SUPERIOR' } }),
      prisma.room.count({ where: { status: 'AVAILABLE' } }),
    ]);

    console.log('\n📊 Room Summary:');
    console.log(`   🏊 Standard Opposite Pool: ${roomCounts[0]} rooms`);
    console.log(`   🛏️  Double Bed: ${roomCounts[1]} rooms`);
    console.log(`   ⭐ Superior: ${roomCounts[2]} rooms`);
    console.log(`   ✅ Available: ${roomCounts[3]} rooms`);
    console.log(`   💰 Price range: ฿2,500 - ฿4,000 per night`);

    // Show room distribution by floor
    console.log('\n🏢 Floor Distribution:');
    for (let floor = 1; floor <= 3; floor++) {
      const floorRooms = await prisma.room.findMany({
        where: { floor },
        select: { roomNumber: true, roomType: true, price: true },
        orderBy: { roomNumber: 'asc' },
      });

      console.log(
        `   Floor ${floor}: ${floorRooms.length} rooms (${floorRooms[0]?.roomNumber} - ${floorRooms[floorRooms.length - 1]?.roomNumber})`,
      );
      console.log(
        `     Type: ${floorRooms[0]?.roomType}, Price: ฿${floorRooms[0]?.price}/night`,
      );
    }
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting database seeding...');

  try {
    await seedRooms();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n🔗 You can now test the API:');
    console.log('   GET /rooms - View all rooms');
    console.log('   GET /rooms/available - View available rooms');
    console.log('   GET /rooms/type/SUPERIOR - View superior rooms');
    console.log('   GET /rooms/floor/2 - View floor 2 rooms');
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

export { main as seedDatabase, seedRooms };
