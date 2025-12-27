export interface RoomTypeAvailability {
  roomType: {
    id: string;
    code: string;
    name: any; // JsonValue from Prisma
    description: any; // JsonValue from Prisma
    basePrice: number;
    maxOccupancy: number;
    bedType: string;
    amenities: string[];
    roomImages: any[];
    thumbnailUrl: string | null;
  };
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  availabilityPercentage: number;
}

export interface AvailabilityResponse {
  checkInDate: string;
  checkOutDate: string;
  totalAvailableRooms: number;
  availableRoomTypes: RoomTypeAvailability[];
}
