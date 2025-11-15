// Quick test to verify multi-file Prisma schema is working
import { PrismaClient } from './prisma/generated/prisma';

async function testMultiFileSchema() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Testing multi-file Prisma schema...');

    // Test room count
    const roomCount = await prisma.room.count();
    console.log(`📊 Total rooms in database: ${roomCount}`);

    // Test if we can fetch a room with the new schema structure
    const sampleRoom = await prisma.room.findFirst({
      select: {
        id: true,
        roomNumber: true,
        roomType: true,
        basePrice: true,
        name: true,
        description: true,
        amenities: true,
      },
    });

    if (sampleRoom) {
      console.log('✅ Sample room data:', {
        id: sampleRoom.id,
        roomNumber: sampleRoom.roomNumber,
        roomType: sampleRoom.roomType,
        basePrice: sampleRoom.basePrice,
        name: sampleRoom.name,
        amenities: sampleRoom.amenities.slice(0, 3), // Show first 3 amenities
      });
    }

    // Test admin count
    const adminCount = await prisma.admin.count();
    console.log(`👨‍💼 Total admins: ${adminCount}`);

    // Test guest count
    const guestCount = await prisma.guest.count();
    console.log(`👥 Total guests: ${guestCount}`);

    console.log('🎉 Multi-file schema test completed successfully!');
  } catch (error) {
    console.error('❌ Multi-file schema test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiFileSchema();
