/**
 * Generates a short booking ID in the format: BK + 6 digits
 * Example: BK123456, BK789012
 */
export function generateBookingId(): string {
  // Generate a random 6-digit number
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `BK${randomNum}`;
}
