import { useState, useEffect } from "react";
import { 
  CURRENCY_CONFIGS, 
  CurrencyConfig, 
  CURRENCY_STORAGE_KEY, 
  COUNTRY_STORAGE_KEY,
  getCurrencyByCountry 
} from "@/lib/currency-config";

interface GeoLocationData {
  countryCode: string;
  countryName: string;
  currency: CurrencyConfig;
  isLoading: boolean;
  error: string | null;
}

interface GeoLocationReturn extends GeoLocationData {
  setPreferredCurrency: (countryCode: string) => void;
  refetch: () => Promise<void>;
}

// Free IP geolocation API
const GEO_API_URL = "https://ipapi.co/json/";

export function useGeoLocation(): GeoLocationReturn {
  const [data, setData] = useState<GeoLocationData>({
    countryCode: "US",
    countryName: "United States",
    currency: CURRENCY_CONFIGS.US,
    isLoading: true,
    error: null,
  });

  const fetchLocation = async () => {
    try {
      // Check localStorage first
      const cachedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY);
      const cachedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
      
      if (cachedCountry && cachedCurrency) {
        const currency = getCurrencyByCountry(cachedCountry);
        setData({
          countryCode: cachedCountry,
          countryName: currency.countryName,
          currency,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Fetch from API
      const response = await fetch(GEO_API_URL);
      
      if (!response.ok) {
        throw new Error("Failed to detect location");
      }

      const geoData = await response.json();
      const countryCode = geoData.country_code || "US";
      
      // Get currency config (fallback to USD if country not supported)
      const currency = getCurrencyByCountry(countryCode);
      
      // Cache the result
      localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency.currencyCode);

      setData({
        countryCode,
        countryName: geoData.country_name || currency.countryName,
        currency,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.warn("Geo-detection failed, using USD default:", error);
      
      // Fallback to USD
      setData({
        countryCode: "US",
        countryName: "United States",
        currency: CURRENCY_CONFIGS.US,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const setPreferredCurrency = (countryCode: string) => {
    const currency = getCurrencyByCountry(countryCode);
    
    localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency.currencyCode);
    
    setData(prev => ({
      ...prev,
      countryCode,
      countryName: currency.countryName,
      currency,
    }));
  };

  return {
    ...data,
    setPreferredCurrency,
    refetch: fetchLocation,
  };
}

// Hook to get just the preferred currency (lighter weight)
export function usePreferredCurrency(): CurrencyConfig {
  const [currency, setCurrency] = useState<CurrencyConfig>(() => {
    const cached = localStorage.getItem(COUNTRY_STORAGE_KEY);
    return cached ? getCurrencyByCountry(cached) : CURRENCY_CONFIGS.US;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const cached = localStorage.getItem(COUNTRY_STORAGE_KEY);
      if (cached) {
        setCurrency(getCurrencyByCountry(cached));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return currency;
}
