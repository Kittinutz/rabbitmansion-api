import { PrismaClient } from '../prisma/generated/prisma';

const prisma = new PrismaClient();

async function verifyRoomTypes() {
  console.log('🔍 Verifying Room Types...\n');

  try {
    // Get all room types
    const roomTypes = await prisma.roomType.findMany({
      select: {
        code: true,
        name: true,
        basePrice: true,
        capacity: true,
        bedType: true,
        hasPoolView: true,
        view: true,
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: {
        basePrice: 'asc',
      },
    });

    console.log('📊 Created Room Types:');
    console.log('='.repeat(100));

    roomTypes.forEach((roomType, index) => {
      const name = (roomType.name as any).en;
      console.log(`${index + 1}. ${name}`);
      console.log(`   Code: ${roomType.code}`);
      console.log(`   Price: $${roomType.basePrice}`);
      console.log(`   Capacity: ${roomType.capacity} guests`);
      console.log(`   Bed Type: ${roomType.bedType}`);
      console.log(`   View: ${roomType.view}`);
      console.log(`   Pool View: ${roomType.hasPoolView ? 'Yes' : 'No'}`);
      console.log(`   Rooms: ${roomType._count.rooms}`);
      console.log('');
    });

    console.log(`✅ Total Room Types: ${roomTypes.length}`);
    console.log(
      `✅ Total Rooms: ${roomTypes.reduce((sum, rt) => sum + rt._count.rooms, 0)}`,
    );

    // Verify against required list
    const requiredRoomTypes = [
      'Deluxe Double Room with Pool View',
      'Deluxe Double Room with balcony',
      'Deluxe Twin Room with balcony',
      'Family Double Room with balcony (1 bathroom)',
      'Premier Double Room with balcony',
      'Super Deluxe Room with Pool view',
      'Super Premier Room with Terrace',
      'Deluxe Twin Room with balcony (No window)',
      'Deluxe Double Room with balcony (No window)',
    ];

    console.log('\n📋 Required Room Types Check:');
    console.log('='.repeat(50));

    const createdNames = roomTypes.map((rt) => (rt.name as any).en);
    const missingTypes: string[] = [];
    const extraTypes: string[] = [];

    requiredRoomTypes.forEach((required) => {
      if (!createdNames.includes(required)) {
        missingTypes.push(required);
      }
    });

    createdNames.forEach((created) => {
      if (!requiredRoomTypes.includes(created)) {
        extraTypes.push(created);
      }
    });

    if (missingTypes.length === 0 && extraTypes.length === 0) {
      console.log('✅ Perfect match! All required room types are created.');
    } else {
      if (missingTypes.length > 0) {
        console.log('❌ Missing room types:');
        missingTypes.forEach((type) => console.log(`   - ${type}`));
      }
      if (extraTypes.length > 0) {
        console.log('ℹ️ Extra room types (not in required list):');
        extraTypes.forEach((type) => console.log(`   - ${type}`));
      }
    }
  } catch (error) {
    console.error('❌ Error verifying room types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRoomTypes();
