// Multi-currency configuration for African SaaS
// Base currency is USD, with exchange rates for African markets

export interface CurrencyConfig {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number; // Rate vs USD (USD = 1.0)
  flag: string;
}

// Default currency configs (also stored in database for admin updates)
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  US: {
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    currencySymbol: "$",
    exchangeRate: 1.0,
    flag: "🇺🇸",
  },
  ZM: {
    countryCode: "ZM",
    countryName: "Zambia",
    currencyCode: "ZMW",
    currencySymbol: "K",
    exchangeRate: 27.5,
    flag: "🇿🇲",
  },
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    exchangeRate: 1550.0,
    flag: "🇳🇬",
  },
  KE: {
    countryCode: "KE",
    countryName: "Kenya",
    currencyCode: "KES",
    currencySymbol: "KSh",
    exchangeRate: 128.0,
    flag: "🇰🇪",
  },
  ZA: {
    countryCode: "ZA",
    countryName: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    exchangeRate: 18.5,
    flag: "🇿🇦",
  },
  GH: {
    countryCode: "GH",
    countryName: "Ghana",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    exchangeRate: 15.8,
    flag: "🇬🇭",
  },
  TZ: {
    countryCode: "TZ",
    countryName: "Tanzania",
    currencyCode: "TZS",
    currencySymbol: "TSh",
    exchangeRate: 2685.0,
    flag: "🇹🇿",
  },
  UG: {
    countryCode: "UG",
    countryName: "Uganda",
    currencyCode: "UGX",
    currencySymbol: "USh",
    exchangeRate: 3680.0,
    flag: "🇺🇬",
  },
  RW: {
    countryCode: "RW",
    countryName: "Rwanda",
    currencyCode: "RWF",
    currencySymbol: "FRw",
    exchangeRate: 1320.0,
    flag: "🇷🇼",
  },
  BW: {
    countryCode: "BW",
    countryName: "Botswana",
    currencyCode: "BWP",
    currencySymbol: "P",
    exchangeRate: 13.6,
    flag: "🇧🇼",
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    currencyCode: "GBP",
    currencySymbol: "£",
    exchangeRate: 0.79,
    flag: "🇬🇧",
  },
  EU: {
    countryCode: "EU",
    countryName: "European Union",
    currencyCode: "EUR",
    currencySymbol: "€",
    exchangeRate: 0.92,
    flag: "🇪🇺",
  },
};

// Get currency config by country code
export function getCurrencyByCountry(countryCode: string): CurrencyConfig {
  return CURRENCY_CONFIGS[countryCode] || CURRENCY_CONFIGS.US;
}

// Get currency config by currency code
export function getCurrencyByCode(currencyCode: string): CurrencyConfig | undefined {
  return Object.values(CURRENCY_CONFIGS).find(c => c.currencyCode === currencyCode);
}

// Convert USD amount to local currency
export function convertToLocalCurrency(usdAmount: number, countryCode: string): number {
  const config = getCurrencyByCountry(countryCode);
  return usdAmount * config.exchangeRate;
}

// Convert local amount to USD
export function convertToUSD(localAmount: number, countryCode: string): number {
  const config = getCurrencyByCountry(countryCode);
  return localAmount / config.exchangeRate;
}

// Format price with currency symbol
export function formatLocalPrice(usdAmount: number, countryCode: string): string {
  const config = getCurrencyByCountry(countryCode);
  const localAmount = usdAmount * config.exchangeRate;
  
  // Format based on amount size
  if (localAmount >= 1000) {
    return `${config.currencySymbol}${localAmount.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  return `${config.currencySymbol}${localAmount.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

// Format USD price
export function formatUSDPrice(amount: number): string {
  return `$${amount.toLocaleString(undefined, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
}

// Get all available currencies for selector
export function getAvailableCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCY_CONFIGS);
}

// Get African currencies only
export function getAfricanCurrencies(): CurrencyConfig[] {
  const africanCodes = ["ZM", "NG", "KE", "ZA", "GH", "TZ", "UG", "RW", "BW"];
  return africanCodes.map(code => CURRENCY_CONFIGS[code]);
}

// Storage key for currency preference
export const CURRENCY_STORAGE_KEY = "omanut_preferred_currency";
export const COUNTRY_STORAGE_KEY = "omanut_detected_country";
