// Asset Depreciation Calculation Utilities
// Supports Straight-Line and Reducing Balance (20% rate) methods

export interface Asset {
  id: string;
  name: string;
  purchase_date: string;
  purchase_cost: number;
  depreciation_method: 'straight_line' | 'reducing_balance';
  useful_life_years: number;
  salvage_value: number;
  status: string;
}

export interface DepreciationResult {
  accumulatedDepreciation: number;
  netBookValue: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  percentDepreciated: number;
  yearsElapsed: number;
  yearsRemaining: number;
  isFullyDepreciated: boolean;
}

export interface DepreciationScheduleEntry {
  year: number;
  yearLabel: string;
  openingValue: number;
  depreciation: number;
  accumulatedDepreciation: number;
  closingValue: number;
}

const REDUCING_BALANCE_RATE = 0.20; // 20% annual rate

/**
 * Calculate the number of years elapsed since purchase
 */
function getYearsElapsed(purchaseDate: string): number {
  const purchase = new Date(purchaseDate);
  const today = new Date();
  const diffTime = today.getTime() - purchase.getTime();
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, diffYears);
}

/**
 * Calculate depreciation using Straight-Line method
 * Formula: (Cost - Salvage) / Useful Life
 */
function calculateStraightLine(asset: Asset): DepreciationResult {
  const yearsElapsed = getYearsElapsed(asset.purchase_date);
  const depreciableAmount = asset.purchase_cost - asset.salvage_value;
  const annualDepreciation = depreciableAmount / asset.useful_life_years;
  const monthlyDepreciation = annualDepreciation / 12;
  
  // Cap accumulated depreciation at depreciable amount
  const maxAccumulated = depreciableAmount;
  const rawAccumulated = annualDepreciation * yearsElapsed;
  const accumulatedDepreciation = Math.min(rawAccumulated, maxAccumulated);
  
  const netBookValue = Math.max(asset.salvage_value, asset.purchase_cost - accumulatedDepreciation);
  const percentDepreciated = depreciableAmount > 0 
    ? (accumulatedDepreciation / depreciableAmount) * 100 
    : 0;
  const yearsRemaining = Math.max(0, asset.useful_life_years - yearsElapsed);
  const isFullyDepreciated = yearsElapsed >= asset.useful_life_years;

  return {
    accumulatedDepreciation,
    netBookValue,
    monthlyDepreciation,
    annualDepreciation,
    percentDepreciated: Math.min(100, percentDepreciated),
    yearsElapsed,
    yearsRemaining,
    isFullyDepreciated,
  };
}

/**
 * Calculate depreciation using Reducing Balance method (20% rate)
 * Formula: NBV × Rate each year
 */
function calculateReducingBalance(asset: Asset): DepreciationResult {
  const yearsElapsed = getYearsElapsed(asset.purchase_date);
  const fullYears = Math.floor(yearsElapsed);
  const partialYear = yearsElapsed - fullYears;
  
  let currentNBV = asset.purchase_cost;
  let totalDepreciation = 0;
  let lastYearDepreciation = 0;
  
  // Calculate for each full year
  for (let year = 0; year < fullYears && currentNBV > asset.salvage_value; year++) {
    const yearDepreciation = currentNBV * REDUCING_BALANCE_RATE;
    const cappedDepreciation = Math.min(yearDepreciation, currentNBV - asset.salvage_value);
    totalDepreciation += cappedDepreciation;
    currentNBV -= cappedDepreciation;
    lastYearDepreciation = cappedDepreciation;
  }
  
  // Add partial year depreciation
  if (partialYear > 0 && currentNBV > asset.salvage_value) {
    const partialDepreciation = (currentNBV * REDUCING_BALANCE_RATE) * partialYear;
    const cappedPartial = Math.min(partialDepreciation, currentNBV - asset.salvage_value);
    totalDepreciation += cappedPartial;
    currentNBV -= cappedPartial;
    lastYearDepreciation = currentNBV * REDUCING_BALANCE_RATE;
  }
  
  const depreciableAmount = asset.purchase_cost - asset.salvage_value;
  const percentDepreciated = depreciableAmount > 0 
    ? (totalDepreciation / depreciableAmount) * 100 
    : 0;
  
  const isFullyDepreciated = currentNBV <= asset.salvage_value;
  const yearsRemaining = isFullyDepreciated ? 0 : Math.max(0, asset.useful_life_years - yearsElapsed);

  return {
    accumulatedDepreciation: totalDepreciation,
    netBookValue: Math.max(asset.salvage_value, currentNBV),
    monthlyDepreciation: lastYearDepreciation / 12,
    annualDepreciation: lastYearDepreciation,
    percentDepreciated: Math.min(100, percentDepreciated),
    yearsElapsed,
    yearsRemaining,
    isFullyDepreciated,
  };
}

/**
 * Main depreciation calculation function
 * Automatically selects the correct method based on asset configuration
 */
export function calculateDepreciation(asset: Asset): DepreciationResult {
  if (asset.depreciation_method === 'reducing_balance') {
    return calculateReducingBalance(asset);
  }
  return calculateStraightLine(asset);
}

/**
 * Generate a full depreciation schedule for an asset
 */
export function generateDepreciationSchedule(asset: Asset): DepreciationScheduleEntry[] {
  const schedule: DepreciationScheduleEntry[] = [];
  const purchaseYear = new Date(asset.purchase_date).getFullYear();
  
  if (asset.depreciation_method === 'straight_line') {
    const annualDepreciation = (asset.purchase_cost - asset.salvage_value) / asset.useful_life_years;
    let openingValue = asset.purchase_cost;
    let totalAccumulated = 0;
    
    for (let i = 0; i < asset.useful_life_years; i++) {
      const depreciation = Math.min(annualDepreciation, openingValue - asset.salvage_value);
      totalAccumulated += depreciation;
      const closingValue = openingValue - depreciation;
      
      schedule.push({
        year: i + 1,
        yearLabel: `${purchaseYear + i}`,
        openingValue,
        depreciation,
        accumulatedDepreciation: totalAccumulated,
        closingValue,
      });
      
      openingValue = closingValue;
    }
  } else {
    // Reducing Balance
    let openingValue = asset.purchase_cost;
    let totalAccumulated = 0;
    
    for (let i = 0; i < asset.useful_life_years && openingValue > asset.salvage_value; i++) {
      const depreciation = Math.min(openingValue * REDUCING_BALANCE_RATE, openingValue - asset.salvage_value);
      totalAccumulated += depreciation;
      const closingValue = openingValue - depreciation;
      
      schedule.push({
        year: i + 1,
        yearLabel: `${purchaseYear + i}`,
        openingValue,
        depreciation,
        accumulatedDepreciation: totalAccumulated,
        closingValue,
      });
      
      openingValue = closingValue;
      
      // Stop if we've reached salvage value
      if (closingValue <= asset.salvage_value) break;
    }
  }
  
  return schedule;
}

/**
 * Format currency in Zambian Kwacha
 */
export function formatCurrency(amount: number, symbol: string = 'K'): string {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get asset category display info
 */
export const ASSET_CATEGORIES = [
  { value: 'IT', label: 'IT Equipment', icon: 'Monitor' },
  { value: 'Vehicles', label: 'Vehicles', icon: 'Car' },
  { value: 'Machinery', label: 'Machinery', icon: 'Cog' },
  { value: 'Furniture', label: 'Furniture', icon: 'Armchair' },
  { value: 'Buildings', label: 'Buildings', icon: 'Building2' },
  { value: 'Other', label: 'Other', icon: 'Package' },
] as const;

export const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Straight-Line', description: 'Equal annual depreciation' },
  { value: 'reducing_balance', label: 'Reducing Balance (20%)', description: 'Higher depreciation in early years' },
] as const;

export const ASSET_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'disposed', label: 'Disposed', color: 'bg-gray-100 text-gray-800' },
  { value: 'fully_depreciated', label: 'Fully Depreciated', color: 'bg-amber-100 text-amber-800' },
] as const;
