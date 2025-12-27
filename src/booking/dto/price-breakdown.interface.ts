export interface PriceBreakdown {
  totalPrice: number; // roomRate * numberOfNights * numberOfRooms (what customer pays)
  numberOfNights: number;
  numberOfRooms: number;
  cityTax: number; // 1% of total (for admin breakdown)
  vat: number; // 7% of total (for admin breakdown)
  netAmount: number; // totalPrice - cityTax - vat (hotel receives)
  discountAmount: number; // if any discount applied
}
