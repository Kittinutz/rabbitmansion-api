import { PrismaClient, RoomType, RoomStatus } from '../generated/prisma';

const prisma = new PrismaClient();

async function seedSampleScenario() {
  console.log('🎭 Creating sample hotel scenario...');

  try {
    // Set some rooms as occupied
    const occupiedRooms = ['101', '105', '201', '205', '301'];
    for (const roomNumber of occupiedRooms) {
      await prisma.room.update({
        where: { roomNumber },
        data: {
          status: 'OCCUPIED',
          description: `Currently occupied room ${roomNumber}. Guest checked in recently.`,
        },
      });
    }
    console.log(`✅ Set ${occupiedRooms.length} rooms as OCCUPIED`);

    // Add custom amenities to some rooms
    await prisma.room.update({
      where: { roomNumber: '108' },
      data: {
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'Pool View',
          'Balcony',
          'Hot Tub',
          'Romantic Package',
        ],
        description:
          'Romantic suite with private hot tub and pool view. Perfect for honeymoons and anniversaries.',
        price: 3200,
      },
    });

    await prisma.room.update({
      where: { roomNumber: '208' },
      data: {
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'King Size Bed',
          'Mini Fridge',
          'Business Desk',
          'Meeting Space',
          'Express Check-in',
        ],
        description:
          'Executive business room with dedicated workspace and meeting facilities.',
        price: 3500,
      },
    });

    console.log('✅ Added special amenities to featured rooms');
    // Set one room as out of order
    await prisma.room.update({
      where: { roomNumber: '110' },
      data: {
        status: 'OUT_OF_ORDER',
        description:
          'Room 110 temporarily out of order. Plumbing repair required.',
      },
    });
    console.log('✅ Set 1 room as OUT_OF_ORDER');

    // Update some room prices for special offers
    const premiumRooms = ['311', '310', '309'];
    for (const roomNumber of premiumRooms) {
      await prisma.room.update({
        where: { roomNumber },
        data: {
          price: 4500,
          description: `Premium superior room ${roomNumber} with panoramic city view. VIP amenities included.`,
        },
      });
    }
    console.log(
      `✅ Updated ${premiumRooms.length} premium rooms with special pricing`,
    );
    // Set some rooms under maintenance
    const maintenanceRooms = ['103', '209'];
    for (const roomNumber of maintenanceRooms) {
      await prisma.room.update({
        where: { roomNumber },
        data: {
          status: 'MAINTENANCE',
          description: `Room ${roomNumber} under maintenance. Air conditioning system upgrade in progress.`,
        },
      });
    }
    console.log(`✅ Set ${maintenanceRooms.length} rooms as MAINTENANCE`);

    // Set one room as out of order
    await prisma.room.update({
      where: { roomNumber: '211' },
      data: {
        status: 'OUT_OF_ORDER',
        description:
          'Room 211 temporarily out of order. Plumbing repair required.',
      },
    });
    console.log('✅ Set 1 room as OUT_OF_ORDER');

    // Update some room prices for special offers
    const premiumRooms = ['311', '310', '309'];
    for (const roomNumber of premiumRooms) {
      await prisma.room.update({
        where: { roomNumber },
        data: {
          price: 4500,
          description: `Premium superior room ${roomNumber} with panoramic city view. VIP amenities included.`,
        },
      });
    }
    console.log(
      `✅ Updated ${premiumRooms.length} premium rooms with special pricing`,
    );

    // Add custom amenities to some rooms
    await prisma.room.update({
      where: { roomNumber: '108' },
      data: {
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'Pool View',
          'Balcony',
          'Hot Tub',
          'Romantic Package',
        ],
        description:
          'Romantic suite with private hot tub and pool view. Perfect for honeymoons and anniversaries.',
        price: 3200,
      },
    });

    await prisma.room.update({
      where: { roomNumber: '208' },
      data: {
        amenities: [
          'WiFi',
          'Air Conditioning',
          'Television',
          'Private Bathroom',
          'King Size Bed',
          'Mini Fridge',
          'Business Desk',
          'Meeting Space',
          'Express Check-in',
        ],
        description:
          'Executive business room with dedicated workspace and meeting facilities.',
        price: 3500,
      },
    });

    console.log('✅ Added special amenities to featured rooms');

    // Display final summary
    const statusCounts = await Promise.all([
      prisma.room.count({ where: { status: 'AVAILABLE' } }),
      prisma.room.count({ where: { status: 'OCCUPIED' } }),
      prisma.room.count({ where: { status: 'MAINTENANCE' } }),
      prisma.room.count({ where: { status: 'OUT_OF_ORDER' } }),
    ]);

    console.log('\n📊 Final Hotel Status:');
    console.log(`   ✅ Available: ${statusCounts[0]} rooms`);
    console.log(`   🏠 Occupied: ${statusCounts[1]} rooms`);
    console.log(`   🔧 Maintenance: ${statusCounts[2]} rooms`);
    console.log(`   ⚠️  Out of Order: ${statusCounts[3]} rooms`);
    console.log(
      `   📈 Occupancy Rate: ${Math.round((statusCounts[1] / 33) * 100)}%`,
    );
  } catch (error) {
    console.error('❌ Error creating sample scenario:', error);
    throw error;
  }
}

async function main() {
  console.log('🏨 Setting up realistic hotel scenario...');

  try {
    await seedSampleScenario();

    console.log('\n🎉 Hotel scenario setup completed!');
    console.log('\n🧪 Test these scenarios:');
    console.log('   GET /rooms?status=AVAILABLE - See available rooms');
    console.log('   GET /rooms?status=OCCUPIED - See occupied rooms');
    console.log('   GET /rooms/type/SUPERIOR - Premium rooms');
    console.log('   GET /rooms/floor/1 - Pool view rooms');
    console.log('   PUT /rooms/1/status - Change room status');
  } catch (error) {
    console.error('💥 Scenario setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the scenario setup
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { seedSampleScenario };
