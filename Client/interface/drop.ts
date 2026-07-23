export interface DropRateSchema {
  code: string; // Item code (e.g. 'ash_wood', 'feather')
  rate: number; // Drop chance rate (1 / rate)
  min_quantity: number; // Minimum quantity dropped
  max_quantity: number; // Maximum quantity dropped
}
