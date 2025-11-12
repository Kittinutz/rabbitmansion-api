import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkRooms() {
  try {
    console.log('🔍 Checking existing rooms...');

    const allRooms = await prisma.room.findMany({
      select: {
        id: true,
        roomNumber: true,
        roomType: true,
        floor: true,
        status: true,
      },
      orderBy: { roomNumber: 'asc' },
    });

    console.log(`\n📊 Found ${allRooms.length} rooms:`);

    // Group by floor
    for (let floor = 1; floor <= 3; floor++) {
      const floorRooms = allRooms.filter((room) => room.floor === floor);
      console.log(`\n🏢 Floor ${floor} (${floorRooms.length} rooms):`);
      floorRooms.forEach((room) => {
        console.log(
          `   ${room.roomNumber} - ${room.roomType} - ${room.status}`,
        );
      });
    }

    // Show the actual room numbers for fixing the scenario
    console.log('\n📝 Available room numbers for scenarios:');
    const availableRooms = allRooms.filter(
      (room) => room.status === 'AVAILABLE',
    );
    console.log(
      'Available:',
      availableRooms
        .map((r) => r.roomNumber)
        .slice(0, 10)
        .join(', '),
      '...',
    );
  } catch (error) {
    console.error('❌ Error checking rooms:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRooms();
