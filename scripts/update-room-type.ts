import { PrismaClient } from '../prisma/generated/prisma';

const prisma = new PrismaClient();

async function updateRoomType() {
  try {
    console.log('🔄 Updating room type...');

    // Update the room type 8 with the new name and code
    const updated = await prisma.roomType.update({
      where: { code: 'DELUXE_TWIN_NO_WINDOW' },
      data: {
        code: 'DELUXE_TWIN_BALCONY_NO_WINDOW',
        name: {
          en: 'Deluxe Twin Room with balcony (No window)',
          th: 'ห้องดีลักซ์ทวินพร้อมระเบียง (ไม่มีหน้าต่าง)',
        },
        description: {
          en: 'Comfortable twin room with balcony but no window',
          th: 'ห้องทวินสะดวกสบายพร้อมระเบียงแต่ไม่มีหน้าต่าง',
        },
        amenities: ['wifi', 'air_conditioning', 'minibar', 'balcony'],
      },
    });

    console.log(
      '✅ Updated room type successfully:',
      (updated.name as { en?: string })?.en || 'Unknown',
    );
  } catch (error) {
    console.error(
      '❌ Error updating room type:',
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await prisma.$disconnect();
  }
}

updateRoomType();
