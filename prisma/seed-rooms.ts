export enum AmenitiesEnum {
  WIFI = 'WIFI',
  AIR_CONDITIONING = 'AIR_CONDITIONING',
  MINIBAR = 'MINIBAR',
  SAFE = 'SAFE',
  TV = 'TV',
  BALCONY = 'BALCONY',
  BATHTUB = 'BATHTUB',
  SHOWER = 'SHOWER',
  DESK = 'DESK',
  BED = 'BED',
  LIVING_ROOM = 'LIVING_ROOM',
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM',
  KING_SIZE_BED = 'KING_SIZE_BED',
  QUEEN_SIZE_BED = 'QUEEN_SIZE_BED',
  TWIN_BEDS = 'TWIN_BEDS',
  ROOM_SERVICE = 'ROOM_SERVICE',
  CITY_VIEW = 'CITY_VIEW',
  POOL_VIEW = 'POOL_VIEW',
}

import { PrismaClient, RoomStatus, BedTypeEnum } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting room and room type seed process...');

  try {
    // Clear existing rooms and room types
    console.log('🧹 Clearing existing data...');
    await prisma.room.deleteMany({});
    await prisma.roomType.deleteMany({});

    // First, create room types based on hotel specification
    const roomTypes = [
      {
        code: 'DELUXE_DOUBLE_POOL_VIEW',
        name: {
          en: 'Deluxe Double Room with Pool View',
          th: 'ห้องดีลักซ์ดับเบิลวิวสระ',
        },
        description: {
          en: 'Luxurious double room with stunning pool views',
          th: 'ห้องดับเบิลหรูหราพร้อมวิวสระสวยงาม',
        },
        basePrice: 3500,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.DOUBLE,
        hasPoolView: true,
        view: 'Pool',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.POOL_VIEW,
          AmenitiesEnum.BATHTUB,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'DELUXE_DOUBLE_BALCONY',
        name: {
          en: 'Deluxe Double Room with balcony',
          th: 'ห้องดีลักซ์ดับเบิลพร้อมระเบียง',
        },
        description: {
          en: 'Elegant double room featuring a private balcony',
          th: 'ห้องดับเบิลหรูหราพร้อมระเบียงส่วนตัว',
        },
        basePrice: 3000,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.DOUBLE,
        hasPoolView: false,
        view: 'Interior',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
          AmenitiesEnum.BATHTUB,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'DELUXE_TWIN_BALCONY',
        name: {
          en: 'Deluxe Twin Room with balcony',
          th: 'ห้องดีลักซ์ทวินพร้อมระเบียง',
        },
        description: {
          en: 'Comfortable twin room with balcony and modern amenities',
          th: 'ห้องทวินสะดวกสบายพร้อมระเบียงและสิ่งอำนวยความสะดวกทันสมัย',
        },
        basePrice: 2800,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 2,
        bedType: BedTypeEnum.TWIN,
        hasPoolView: false,
        view: 'Interior',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'FAMILY_DOUBLE_BALCONY',
        name: {
          en: 'Family Double Room with balcony (1 bathroom)',
          th: 'ห้องดับเบิลครอบครัวพร้อมระเบียง (1 ห้องน้ำ)',
        },
        description: {
          en: 'Spacious family room with double bed, balcony and one bathroom',
          th: 'ห้องครอบครัวขนาดใหญ่พร้อมเตียงดับเบิล ระเบียง และห้องน้ำหนึ่งห้อง',
        },
        basePrice: 3800,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 4,
        bedCount: 1,
        bedType: BedTypeEnum.DOUBLE,
        hasPoolView: false,
        view: 'Garden',
        smokingAllowed: false,
        petFriendly: true,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'PREMIER_DOUBLE_BALCONY',
        name: {
          en: 'Premier Double Room with balcony',
          th: 'ห้องพรีเมียร์ดับเบิลพร้อมระเบียง',
        },
        description: {
          en: 'Premium double room with balcony and luxury amenities',
          th: 'ห้องดับเบิลพรีเมียมพร้อมระเบียงและสิ่งอำนวยความสะดวกหรูหรา',
        },
        basePrice: 4200,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.DOUBLE,
        hasPoolView: false,
        view: 'City',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
          AmenitiesEnum.BATHTUB,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'SUPER_DELUXE_POOL_VIEW',
        name: {
          en: 'Super Deluxe Room with Pool view',
          th: 'ห้องซูเปอร์ดีลักซ์วิวสระ',
        },
        description: {
          en: 'Ultimate luxury room with spectacular pool views',
          th: 'ห้องหรูหราระดับสูงสุดพร้อมวิวสระที่งดงาม',
        },
        basePrice: 5000,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.KING,
        hasPoolView: true,
        view: 'Pool',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.POOL_VIEW,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'SUPER_PREMIER_TERRACE',
        name: {
          en: 'Super Premier Room with Terrace',
          th: 'ห้องซูเปอร์พรีเมียร์พร้อมเทอเรส',
        },
        description: {
          en: 'Luxurious premier room with spacious terrace and premium amenities',
          th: 'ห้องพรีเมียร์หรูหราพร้อมเทอเรสขนาดใหญ่และสิ่งอำนวยความสะดวกระดับพรีเมียม',
        },
        basePrice: 6000,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.KING,
        hasPoolView: false,
        view: 'City',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'DELUXE_TWIN_BALCONY_NO_WINDOW',
        name: {
          en: 'Deluxe Twin Room with balcony (No window)',
          th: 'ห้องดีลักซ์ทวินพร้อมระเบียง (ไม่มีหน้าต่าง)',
        },
        description: {
          en: 'Modern twin room with balcony, designed for comfort without traditional windows',
          th: 'ห้องทวินทันสมัยพร้อมระเบียง ออกแบบเพื่อความสะดวกสบายโดยไม่มีหน้าต่างแบบดั้งเดิม',
        },
        basePrice: 2500,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 2,
        bedType: BedTypeEnum.TWIN,
        hasPoolView: false,
        view: 'Interior',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
        isActive: true,
      },
      {
        code: 'DELUXE_DOUBLE_BALCONY_NO_WINDOW',
        name: {
          en: 'Deluxe Double Room with balcony (No window)',
          th: 'ห้องดีลักซ์ดับเบิลพร้อมระเบียง (ไม่มีหน้าต่าง)',
        },
        description: {
          en: 'Contemporary double room with balcony, featuring innovative design without traditional windows',
          th: 'ห้องดับเบิลร่วมสมัยพร้อมระเบียง มีการออกแบบที่นวัตกรรมโดยไม่มีหน้าต่างแบบดั้งเดิม',
        },
        basePrice: 2700,
        seasonalPricing: {
          peak: 1.5,
          high: 1.2,
          low: 0.8,
        },
        capacity: 2,
        bedCount: 1,
        bedType: BedTypeEnum.DOUBLE,
        hasPoolView: false,
        view: 'Interior',
        smokingAllowed: false,
        petFriendly: false,
        amenities: [
          AmenitiesEnum.WIFI,
          AmenitiesEnum.AIR_CONDITIONING,
          AmenitiesEnum.TV,
          AmenitiesEnum.MINIBAR,
          AmenitiesEnum.SAFE,
          AmenitiesEnum.BALCONY,
        ],
        mainImage: null,
        galleryImages: [],
        bannerImage: null,
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

    // Define room distribution by floor based on new room types
    const roomDistribution = [
      // Floor 1 (101-117): Entry level deluxe rooms
      {
        floor: 1,
        pattern: [
          'DELUXE_DOUBLE_BALCONY',
          'DELUXE_TWIN_BALCONY',
          'DELUXE_DOUBLE_BALCONY_NO_WINDOW',
          'DELUXE_TWIN_BALCONY_NO_WINDOW',
        ],
      },
      // Floor 2 (201-217): Premium and family rooms
      {
        floor: 2,
        pattern: [
          'DELUXE_DOUBLE_POOL_VIEW',
          'PREMIER_DOUBLE_BALCONY',
          'FAMILY_DOUBLE_BALCONY',
          'DELUXE_DOUBLE_BALCONY',
        ],
      },
      // Floor 3 (301-317): Top tier luxury rooms
      {
        floor: 3,
        pattern: [
          'SUPER_DELUXE_POOL_VIEW',
          'SUPER_PREMIER_TERRACE',
          'DELUXE_DOUBLE_POOL_VIEW',
          'PREMIER_DOUBLE_BALCONY',
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
          size: sizeMap[roomTypeCode] || 35,
          accessible: roomNum <= 3, // First 3 rooms on each floor are accessible
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
