import { PrismaClient } from '../prisma/generated/prisma';

const prisma = new PrismaClient();

async function seedRoomTypes() {
  console.log('🌱 Seeding room types...');

  const roomTypes = [
    {
      id: 'rm_type_1',
      code: 'DELUXE_DOUBLE_POOL_VIEW',
      name: {
        en: 'Deluxe Double Room with Pool View',
        th: 'ห้องดีลักซ์ดับเบิลวิวสระ',
      },
      description: {
        en: 'Spacious double room with beautiful pool view',
        th: 'ห้องดับเบิลกว้างขวางพร้อมวิวสระว่ายน้ำสวยงาม',
      },
      basePrice: 2500.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: true,
      amenities: [
        'wifi',
        'air_conditioning',
        'minibar',
        'balcony',
        'pool_view',
      ],
    },
    {
      id: 'rm_type_2',
      code: 'DELUXE_DOUBLE_BALCONY',
      name: {
        en: 'Deluxe Double Room with balcony',
        th: 'ห้องดีลักซ์ดับเบิลพร้อมระเบียง',
      },
      description: {
        en: 'Comfortable double room with private balcony',
        th: 'ห้องดับเบิลสะดวกสบายพร้อมระเบียงส่วนตัว',
      },
      basePrice: 2200.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: false,
      amenities: ['wifi', 'air_conditioning', 'minibar', 'balcony'],
    },
    {
      id: 'rm_type_3',
      code: 'DELUXE_TWIN_BALCONY',
      name: {
        en: 'Deluxe Twin Room with balcony',
        th: 'ห้องดีลักซ์ทวินพร้อมระเบียง',
      },
      description: {
        en: 'Twin bed room with private balcony',
        th: 'ห้องเตียงแฝดพร้อมระเบียงส่วนตัว',
      },
      basePrice: 2100.0,
      capacity: 2,
      bedType: 'Twin',
      hasPoolView: false,
      amenities: ['wifi', 'air_conditioning', 'minibar', 'balcony'],
    },
    {
      id: 'rm_type_4',
      code: 'FAMILY_DOUBLE_BALCONY',
      name: {
        en: 'Family Double Room with balcony (1 bathroom)',
        th: 'ห้องแฟมิลี่ดับเบิลพร้อมระเบียง (ห้องน้ำ 1 ห้อง)',
      },
      description: {
        en: 'Spacious family room with double bed and balcony',
        th: 'ห้องแฟมิลี่กว้างขวางพร้อมเตียงดับเบิลและระเบียง',
      },
      basePrice: 2800.0,
      capacity: 4,
      bedType: 'Family',
      hasPoolView: false,
      amenities: [
        'wifi',
        'air_conditioning',
        'minibar',
        'balcony',
        'family_friendly',
      ],
    },
    {
      id: 'rm_type_5',
      code: 'PREMIER_DOUBLE_BALCONY',
      name: {
        en: 'Premier Double Room with balcony',
        th: 'ห้องพรีเมียร์ดับเบิลพร้อมระเบียง',
      },
      description: {
        en: 'Premium double room with luxurious balcony',
        th: 'ห้องดับเบิลพรีเมียมพร้อมระเบียงหรูหรา',
      },
      basePrice: 3000.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: false,
      amenities: [
        'wifi',
        'air_conditioning',
        'minibar',
        'balcony',
        'premium_amenities',
      ],
    },
    {
      id: 'rm_type_6',
      code: 'SUPER_DELUXE_POOL_VIEW',
      name: {
        en: 'Super Deluxe Room with Pool view',
        th: 'ห้องซุปเปอร์ดีลักซ์วิวสระ',
      },
      description: {
        en: 'Luxurious room with spectacular pool view',
        th: 'ห้องหรูหราพร้อมวิวสระว่ายน้ำสวยงาม',
      },
      basePrice: 3200.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: true,
      amenities: [
        'wifi',
        'air_conditioning',
        'minibar',
        'balcony',
        'pool_view',
        'premium_amenities',
      ],
    },
    {
      id: 'rm_type_7',
      code: 'SUPER_PREMIER_TERRACE',
      name: {
        en: 'Super Premier Room with Terrace',
        th: 'ห้องซุปเปอร์พรีเมียร์พร้อมเทอร์เรส',
      },
      description: {
        en: 'Ultimate luxury room with private terrace',
        th: 'ห้องหรูหราสุดพร้อมเทอร์เรสส่วนตัว',
      },
      basePrice: 3800.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: false,
      amenities: [
        'wifi',
        'air_conditioning',
        'minibar',
        'terrace',
        'premium_amenities',
        'luxury_suite',
      ],
    },
    {
      id: 'rm_type_8',
      code: 'DELUXE_TWIN_NO_WINDOW',
      name: {
        en: 'Deluxe Twin Room (No window)',
        th: 'ห้องดีลักซ์ทวิน (ไม่มีหน้าต่าง)',
      },
      description: {
        en: 'Comfortable twin room without window',
        th: 'ห้องทวินสะดวกสบายไม่มีหน้าต่าง',
      },
      basePrice: 1800.0,
      capacity: 2,
      bedType: 'Twin',
      hasPoolView: false,
      amenities: ['wifi', 'air_conditioning', 'minibar'],
    },
    {
      id: 'rm_type_9',
      code: 'DELUXE_DOUBLE_BALCONY_NO_WINDOW',
      name: {
        en: 'Deluxe Double Room with balcony (No window)',
        th: 'ห้องดีลักซ์ดับเบิลพร้อมระเบียง (ไม่มีหน้าต่าง)',
      },
      description: {
        en: 'Double room with balcony access but no window',
        th: 'ห้องดับเบิลพร้อมระเบียงแต่ไม่มีหน้าต่าง',
      },
      basePrice: 2000.0,
      capacity: 2,
      bedType: 'Double',
      hasPoolView: false,
      amenities: ['wifi', 'air_conditioning', 'minibar', 'balcony'],
    },
  ];

  for (const roomType of roomTypes) {
    const existing = await prisma.roomType.findUnique({
      where: { code: roomType.code },
    });

    if (!existing) {
      await prisma.roomType.create({
        data: roomType,
      });
      console.log(`✅ Created room type: ${roomType.name.en}`);
    } else {
      console.log(`⏭️ Room type already exists: ${roomType.name.en}`);
    }
  }

  console.log('🎉 Room types seeding completed!');
}

seedRoomTypes()
  .catch((error) => {
    console.error('❌ Error seeding room types:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
