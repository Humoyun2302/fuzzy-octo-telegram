import { Barber, Service } from '../types';

/**
 * Calculate dynamic price range from barber's services
 * Min: Cheapest single service
 * Max: Most expensive single service
 */
export function calculatePriceRange(barber: Barber): { min: number; max: number } {
  // Use services if available
  if (barber.services && barber.services.length > 0) {
    const prices = barber.services.map(s => s.price);
    return {
      min: Math.min(...prices), // Cheapest single service
      max: Math.max(...prices) // Most expensive single service
    };
  }
  
  // Fallback to static priceRange if no services defined
  return barber.priceRange;
}

/**
 * Calculate price range from services array directly
 */
export function calculatePriceRangeFromServices(services: Service[]): { min: number; max: number } {
  if (services.length === 0) {
    return { min: 0, max: 0 };
  }
  
  const prices = services.map(s => s.price);
  return {
    min: Math.min(...prices), // Cheapest single service
    max: Math.max(...prices) // Most expensive single service
  };
}