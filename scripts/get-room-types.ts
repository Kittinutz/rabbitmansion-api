import { PrismaClient } from '../prisma/generated/prisma';

const prisma = new PrismaClient();

async function getRoomTypes() {
  const roomTypes = await prisma.roomType.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  console.log('Available Room Types:');
  roomTypes.forEach((type) => {
    console.log(`- ${type.code}: ${type.name.en}`);
  });

  return roomTypes;
}

getRoomTypes().finally(async () => {
  await prisma.$disconnect();
});
