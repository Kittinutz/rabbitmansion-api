export interface IndividualRoomTypeAvailability {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: {
    id: string;
    code: string;
    name: any; // JsonValue from Prisma
    description: any; // JsonValue from Prisma
    basePrice: number;
    capacity: number;
    bedType: string;
    amenities: string[];
    hasPoolView: boolean;
    thumbnailUrl: string | null;
    roomImages: Array<{
      id: string;
      url: string;
      alt: string | null;
      caption?: any;
      isPrimary: boolean;
      sortOrder: number;
    }>;
  };
  availability: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    availabilityPercentage: number;
    isAvailable: boolean;
  };
  availableRoomList?: Array<{
    roomId: string;
    roomNumber: string;
    floor: number;
    size?: number;
    accessible: boolean;
  }>;
}
