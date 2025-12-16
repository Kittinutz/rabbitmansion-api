import { PrismaService } from '../src/prima/prisma.service';
import {
  BookingStatus,
  RoomBookingStatus,
  RoomStatus,
} from './generated/prisma';

const prisma = new PrismaService();

async function main() {
  console.log('🌱 Starting comprehensive booking and room assignment seed...');

  // Clear existing data
  console.log('🧹 Clearing existing booking data...');
  await prisma.roomBooking.deleteMany();
  await prisma.booking.deleteMany();

  // Get existing data for seeding
  const guests = await prisma.guest.findMany();
  const rooms = await prisma.room.findMany({
    include: { roomType: true },
    orderBy: { roomNumber: 'asc' },
  });

  if (guests.length === 0) {
    console.log('⚠️  No guests found. Please run guest seed first.');
    return;
  }

  if (rooms.length === 0) {
    console.log('⚠️  No rooms found. Please run room seed first.');
    return;
  }

  console.log(`📊 Found ${guests.length} guests and ${rooms.length} rooms`);

  const bookings = [];
  const roomAssignments = [];
  const now = new Date();

  // Scenario 1: Current single-room bookings (traditional model)
  console.log('📝 Creating single-room bookings...');

  for (let i = 0; i < 8; i++) {
    const guest = guests[i % guests.length];
    const room = rooms[i];
    const checkInDate = new Date(now);
    checkInDate.setDate(now.getDate() + i - 2); // Some past, some future
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(
      checkInDate.getDate() + Math.floor(Math.random() * 4) + 1,
    ); // 1-4 nights

    const baseAmount = room.roomType.basePrice;
    const taxAmount = baseAmount * 0.1;
    const serviceCharges = baseAmount * 0.07;
    const finalAmount = baseAmount + taxAmount + serviceCharges;

    const booking = {
      id: generateBookingId(),
      bookingNumber: await generateBookingNumber(i + 1),
      guestId: guest.id,
      checkInDate,
      checkOutDate,
      numberOfGuests: Math.floor(Math.random() * room.roomType.capacity) + 1,
      numberOfChildren: Math.floor(Math.random() * 2),
      totalAmount: baseAmount,
      taxAmount,
      serviceCharges,
      finalAmount,
      status:
        checkInDate <= now && checkOutDate > now
          ? BookingStatus.CHECKED_IN
          : checkInDate > now
            ? BookingStatus.CONFIRMED
            : BookingStatus.CHECKED_OUT,
      source: ['Website', 'Phone', 'Walk-in', 'Agent'][
        Math.floor(Math.random() * 4)
      ],
      notes: i % 3 === 0 ? 'Guest requested late check-out' : null,
      specialRequests: i % 4 === 0 ? 'Extra towels and pillows' : null,
    };

    bookings.push(booking);

    roomAssignments.push({
      id: generateBookingId(),
      roomId: room.id,
      bookingId: booking.id,
      roomRate: room.roomType.basePrice,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      status:
        booking.status === BookingStatus.CHECKED_IN
          ? RoomBookingStatus.CHECKED_IN
          : booking.status === BookingStatus.CHECKED_OUT
            ? RoomBookingStatus.CHECKED_OUT
            : RoomBookingStatus.ASSIGNED,
      notes: i % 5 === 0 ? 'Preferred room as requested by guest' : null,
    });
  }

  // Scenario 2: Multi-room family booking
  console.log('👨‍👩‍👧‍👦 Creating family multi-room booking...');

  const familyGuest = guests[Math.floor(guests.length / 2)];
  const familyRooms = rooms.slice(8, 11); // 3 adjacent rooms
  const familyCheckIn = new Date(now);
  familyCheckIn.setDate(now.getDate() + 5); // 5 days from now
  const familyCheckOut = new Date(familyCheckIn);
  familyCheckOut.setDate(familyCheckIn.getDate() + 7); // 7 nights

  const totalFamilyAmount = familyRooms.reduce(
    (sum, room) => sum + room.roomType.basePrice,
    0,
  );
  const familyTaxAmount = totalFamilyAmount * 0.1;
  const familyServiceCharges = totalFamilyAmount * 0.07;
  const familyFinalAmount =
    totalFamilyAmount + familyTaxAmount + familyServiceCharges;

  const familyBooking = {
    id: generateBookingId(),
    bookingNumber: await generateBookingNumber(bookings.length + 1),
    guestId: familyGuest.id,
    checkInDate: familyCheckIn,
    checkOutDate: familyCheckOut,
    numberOfGuests: 6,
    numberOfChildren: 3,
    totalAmount: totalFamilyAmount,
    taxAmount: familyTaxAmount,
    serviceCharges: familyServiceCharges,
    finalAmount: familyFinalAmount,
    status: BookingStatus.CONFIRMED,
    source: 'Website',
    notes: 'Family vacation - requested connecting rooms',
    specialRequests: 'Baby cot in parents room, extra blankets',
  };

  bookings.push(familyBooking);

  familyRooms.forEach((room, index) => {
    roomAssignments.push({
      id: generateBookingId(),
      roomId: room.id,
      bookingId: familyBooking.id,
      roomRate: room.roomType.basePrice,
      checkInDate: familyBooking.checkInDate,
      checkOutDate: familyBooking.checkOutDate,
      status: RoomBookingStatus.ASSIGNED,
      notes:
        index === 0
          ? 'Parents room with baby cot'
          : index === 1
            ? 'Kids room 1'
            : 'Kids room 2',
    });
  });

  // Scenario 3: Corporate group booking
  console.log('🏢 Creating corporate group booking...');

  const corporateGuest = guests[Math.floor(guests.length * 0.75)];
  const corporateRooms = rooms.slice(11, 16); // 5 rooms for corporate group
  const corporateCheckIn = new Date(now);
  corporateCheckIn.setDate(now.getDate() + 10); // 10 days from now
  const corporateCheckOut = new Date(corporateCheckIn);
  corporateCheckOut.setDate(corporateCheckIn.getDate() + 3); // 3 nights

  const totalCorporateAmount = corporateRooms.reduce(
    (sum, room) => sum + room.roomType.basePrice,
    0,
  );
  const corporateDiscount = totalCorporateAmount * 0.15; // 15% corporate discount
  const discountedAmount = totalCorporateAmount - corporateDiscount;
  const corporateTaxAmount = discountedAmount * 0.1;
  const corporateServiceCharges = discountedAmount * 0.07;
  const corporateFinalAmount =
    discountedAmount + corporateTaxAmount + corporateServiceCharges;

  const corporateBooking = {
    id: generateBookingId(),
    bookingNumber: await generateBookingNumber(bookings.length + 1),
    guestId: corporateGuest.id,
    checkInDate: corporateCheckIn,
    checkOutDate: corporateCheckOut,
    numberOfGuests: 5,
    numberOfChildren: 0,
    totalAmount: totalCorporateAmount,
    taxAmount: corporateTaxAmount,
    serviceCharges: corporateServiceCharges,
    discountAmount: corporateDiscount,
    finalAmount: corporateFinalAmount,
    status: BookingStatus.CONFIRMED,
    source: 'Agent',
    notes: 'Corporate booking - TechCorp annual meeting',
    specialRequests: 'Meeting room access, late check-out for all rooms',
  };

  bookings.push(corporateBooking);

  corporateRooms.forEach((room, index) => {
    roomAssignments.push({
      id: generateBookingId(),
      roomId: room.id,
      bookingId: corporateBooking.id,
      roomRate: room.roomType.basePrice * 0.85, // Apply corporate discount
      checkInDate: corporateBooking.checkInDate,
      checkOutDate: corporateBooking.checkOutDate,
      status: RoomBookingStatus.ASSIGNED,
      notes: `Corporate guest ${index + 1} - ${['CEO', 'CTO', 'Manager', 'Developer', 'Designer'][index]}`,
    });
  });

  // Scenario 4: Past booking (checked out)
  console.log('📋 Creating past booking (checked out)...');

  const pastGuest = guests[guests.length - 1];
  const pastRoom = rooms[16];
  const pastCheckIn = new Date(now);
  pastCheckIn.setDate(now.getDate() - 7); // 7 days ago
  const pastCheckOut = new Date(pastCheckIn);
  pastCheckOut.setDate(pastCheckIn.getDate() + 2); // 2 nights, ended 5 days ago

  const pastAmount = pastRoom.roomType.basePrice;
  const pastTaxAmount = pastAmount * 0.1;
  const pastServiceCharges = pastAmount * 0.07;
  const pastFinalAmount = pastAmount + pastTaxAmount + pastServiceCharges;

  const pastBooking = {
    id: generateBookingId(),
    bookingNumber: await generateBookingNumber(bookings.length + 1),
    guestId: pastGuest.id,
    checkInDate: pastCheckIn,
    checkOutDate: pastCheckOut,
    actualCheckIn: pastCheckIn,
    actualCheckOut: pastCheckOut,
    numberOfGuests: 1,
    numberOfChildren: 0,
    totalAmount: pastAmount,
    taxAmount: pastTaxAmount,
    serviceCharges: pastServiceCharges,
    finalAmount: pastFinalAmount,
    status: BookingStatus.CHECKED_OUT,
    source: 'Phone',
    notes: 'Regular business traveler',
  };

  bookings.push(pastBooking);

  roomAssignments.push({
    id: generateBookingId(),
    roomId: pastRoom.id,
    bookingId: pastBooking.id,
    roomRate: pastRoom.roomType.basePrice,
    checkInDate: pastBooking.checkInDate,
    checkOutDate: pastBooking.checkOutDate,
    status: RoomBookingStatus.CHECKED_OUT,
  });

  // Scenario 5: Cancelled booking
  console.log('❌ Creating cancelled booking...');

  const cancelledGuest = guests[Math.floor(guests.length * 0.3)];
  const cancelledRoom = rooms[17];
  const cancelledCheckIn = new Date(now);
  cancelledCheckIn.setDate(now.getDate() + 3); // 3 days from now
  const cancelledCheckOut = new Date(cancelledCheckIn);
  cancelledCheckOut.setDate(cancelledCheckIn.getDate() + 1); // 1 night

  const cancelledBooking = {
    id: generateBookingId(),
    bookingNumber: await generateBookingNumber(bookings.length + 1),
    guestId: cancelledGuest.id,
    checkInDate: cancelledCheckIn,
    checkOutDate: cancelledCheckOut,
    numberOfGuests: 2,
    numberOfChildren: 0,
    totalAmount: cancelledRoom.roomType.basePrice,
    taxAmount: cancelledRoom.roomType.basePrice * 0.1,
    serviceCharges: cancelledRoom.roomType.basePrice * 0.07,
    finalAmount: cancelledRoom.roomType.basePrice * 1.17,
    status: BookingStatus.CANCELLED,
    source: 'Website',
    cancellationReason: 'Guest cancelled due to flight delay',
    notes: 'Cancelled 2 days before arrival',
  };

  bookings.push(cancelledBooking);

  roomAssignments.push({
    id: generateBookingId(),
    roomId: cancelledRoom.id,
    bookingId: cancelledBooking.id,
    roomRate: cancelledRoom.roomType.basePrice,
    checkInDate: cancelledBooking.checkInDate,
    checkOutDate: cancelledBooking.checkOutDate,
    status: RoomBookingStatus.CANCELLED,
    notes: 'Booking cancelled by guest',
  });

  // Create all bookings and room assignments
  console.log('💾 Saving bookings to database...');

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  console.log('🏨 Saving room assignments to database...');

  for (const assignment of roomAssignments) {
    await prisma.roomBooking.create({ data: assignment });
  }

  // Update room statuses based on current bookings
  console.log('🔄 Updating room statuses...');

  const currentBookings = roomAssignments.filter(
    (rb) =>
      rb.status === RoomBookingStatus.CHECKED_IN ||
      (rb.status === RoomBookingStatus.ASSIGNED &&
        rb.checkInDate <= now &&
        rb.checkOutDate > now),
  );

  for (const assignment of currentBookings) {
    await prisma.room.update({
      where: { id: assignment.roomId },
      data: { status: RoomStatus.OCCUPIED },
    });
  }

  // Set some rooms to maintenance/cleaning status
  const maintenanceRooms = rooms.slice(18, 20);
  for (const room of maintenanceRooms) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: RoomStatus.MAINTENANCE },
    });
  }

  const cleaningRooms = rooms.slice(20, 22);
  for (const room of cleaningRooms) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: RoomStatus.CLEANING },
    });
  }

  console.log('✅ Booking and room assignment seed completed!');
  console.log(`📊 Summary:`);
  console.log(`   • Created ${bookings.length} bookings`);
  console.log(`   • Created ${roomAssignments.length} room assignments`);
  console.log(`   • Single-room bookings: 8`);
  console.log(`   • Multi-room family booking: 1 (3 rooms)`);
  console.log(`   • Corporate group booking: 1 (5 rooms)`);
  console.log(`   • Past booking: 1`);
  console.log(`   • Cancelled booking: 1`);
  console.log(`   • Rooms in various statuses updated`);

  // Summary by booking status
  const statusCounts = bookings.reduce(
    (acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`   • Booking status distribution:`, statusCounts);
}

function generateBookingId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function generateBookingNumber(sequence: number): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `BK${year}${month}${day}${String(sequence).padStart(4, '0')}`;
}

main()
  .catch((e) => {
    console.error('❌ Error seeding bookings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
