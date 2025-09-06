/**
 * Multi-Region System - Region Utilities (Mobile App)
 * 
 * This module provides region mapping and utilities for the multi-region system.
 * It maps countries to their optimal Firebase regions for database, storage, and functions.
 * 
 * Note: This is synchronized with web-admin-hooked/src/lib/regionUtils.ts
 * Updated to match actual Firebase project structure
 */

export interface RegionConfig {
  database: string; // Database name (e.g., "(default)", "au-southeast2", "eu-eur3")
  storage: string; // Storage bucket name (e.g., "hooked-69.firebasestorage.app", "hooked-australia")
  functions: string; // Functions deployment region (e.g., "me-west1", "australia-southeast2")
  projectId?: string; // For separate projects per region (future use)
  isActive: boolean;
  displayName: string;
  latencyOptimizedFor: string[]; // Countries this region optimizes for
}

export interface CountryRegionMapping {
  [country: string]: RegionConfig;
}

/**
 * Country to Region Mapping Configuration
 * 
 * Updated to match actual Firebase project structure:
 * - Databases: (default), au-southeast2, eu-eur3, us-nam5
 * - Storage: hooked-69.firebasestorage.app, hooked-australia, hooked-eu, hooked-us-nam5, hooked-asia
 * - Functions: Regional deployment to match database regions
 */

// Check if we're in development environment
const isDevelopment = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID === 'hooked-development';

// Map production buckets to development buckets
const BUCKET_MAPPING: { [key: string]: string } = {
  'hooked-69.firebasestorage.app': 'hooked-development.firebasestorage.app',
  'hooked-australia': 'hooked-australia-dev',
  'hooked-eu': 'hooked-eu-dev',
  'hooked-us-nam5': 'hooked-us-nam5-dev',
  'hooked-asia': 'hooked-asia-dev',
  'hooked-southamerica-east1': 'hooked-southamerica-east1-dev'
};

// Use development storage bucket for all regions in development environment
const getStorageBucket = (productionBucket: string) => {
  if (isDevelopment) {
    return BUCKET_MAPPING[productionBucket] || 'hooked-development.firebasestorage.app';
  }
  return productionBucket;
};

export const COUNTRY_REGION_MAPPING: CountryRegionMapping = {
  // Phase 1: Active Regions (Israel + Australia)
  'Israel': {
    database: '(default)', // me-west1 default database
    storage: getStorageBucket('hooked-69.firebasestorage.app'), // me-west1 default storage
    functions: 'me-west1',
    isActive: true,
    displayName: 'Middle East (Israel)',
    latencyOptimizedFor: ['Israel', 'Palestine', 'Lebanon', 'Jordan', 'Syria', 'Cyprus']
  },
  'Australia': {
    database: 'au-southeast2',
    storage: getStorageBucket('hooked-australia'), // australia-southeast2 dual-region
    functions: 'australia-southeast2', 
    isActive: true,
    displayName: 'Australia (Sydney)',
    latencyOptimizedFor: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji']
  },

  // Phase 2: Active Multi-Region Support
  'United States': {
    database: 'us-nam5',
    storage: getStorageBucket('hooked-us-nam5'), // nam5 multi-region
    functions: 'us-central1', // Primary US functions region
    isActive: true,
    displayName: 'US Multi-Region (NAM5)',
    latencyOptimizedFor: ['United States', 'Canada', 'Mexico']
  },
  'United Kingdom': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'), // eur3 multi-region 
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['United Kingdom', 'Ireland', 'Iceland']
  },
  'Germany': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Germany', 'Austria', 'Switzerland', 'Netherlands', 'Belgium']
  },
  'France': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['France']
  },
  'Spain': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Spain', 'Portugal']
  },
  'Italy': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Italy']
  },

  // Phase 3: Active Asia Region Support
  'Japan': {
    database: 'asia-ne1', // asia-northeast1 single-region database
    storage: getStorageBucket('hooked-asia'), // asia multi-region storage
    functions: 'asia-northeast1',
    isActive: true, // Asia database now available
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Japan', 'South Korea']
  },
  'Singapore': {
    database: 'asia-ne1', // All Asia countries use same database
    storage: getStorageBucket('hooked-asia'),
    functions: 'asia-northeast1', // Consolidated to single Asia functions region
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines']
  },
  'South Korea': {
    database: 'asia-ne1',
    storage: getStorageBucket('hooked-asia'),
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['South Korea']
  },
  'Thailand': {
    database: 'asia-ne1',
    storage: getStorageBucket('hooked-asia'),
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Thailand']
  },
  'Malaysia': {
    database: 'asia-ne1',
    storage: getStorageBucket('hooked-asia'),
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Malaysia']
  },
  'Indonesia': {
    database: 'asia-ne1',
    storage: getStorageBucket('hooked-asia'),
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Indonesia']
  },

  // Additional countries mapped to nearest active regions
  'New Zealand': {
    database: 'au-southeast2',
    storage: getStorageBucket('hooked-australia'),
    functions: 'australia-southeast2',
    isActive: true,
    displayName: 'Australia Dual-Region - Optimized for NZ',
    latencyOptimizedFor: ['New Zealand']
  },
  'Canada': {
    database: 'us-nam5',
    storage: getStorageBucket('hooked-us-nam5'),
    functions: 'us-central1', // Use US central for Canada
    isActive: true,
    displayName: 'US Multi-Region (NAM5) - Optimized for Canada',
    latencyOptimizedFor: ['Canada']
  },
  'Netherlands': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Netherlands']
  },
  'Belgium': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Belgium']
  },
  'Portugal': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Portugal']
  },
  'Austria': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Austria']
  },
  'Switzerland': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Switzerland']
  },
  'Ireland': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Ireland']
  },
  'Poland': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Poland']
  },
  'Czech Republic': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Czech Republic']
  },
  'Sweden': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Sweden']
  },
  'Norway': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Norway']
  },
  'Denmark': {
    database: 'eu-eur3',
    storage: getStorageBucket('hooked-eu'),
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Denmark']
  },

  // Phase 4: Active South America Region Support
  'Brazil': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Brazil']
  },
  'Argentina': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Argentina']
  },
  'Chile': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Chile']
  },
  'Colombia': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Colombia']
  },
  'Peru': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Peru']
  },
  'Venezuela': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Venezuela']
  },
  'Uruguay': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Uruguay']
  },
  'Paraguay': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Paraguay']
  },
  'Bolivia': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Bolivia']
  },
  'Ecuador': {
    database: 'southamerica-east1',
    storage: getStorageBucket('hooked-southamerica-east1'),
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Ecuador']
  }
};

/**
 * Default Region Configuration (Israel - me-west1)
 * Used as fallback when country is not mapped or region is inactive
 */
export const DEFAULT_REGION: RegionConfig = {
  database: '(default)',
  storage: getStorageBucket('hooked-69.firebasestorage.app'),
  functions: 'me-west1',
  isActive: true,
  displayName: 'Default (Middle East - Israel)',
  latencyOptimizedFor: ['Default/Fallback']
};

/**
 * Get region configuration for a specific country
 * Falls back to default region if country is not mapped or region is inactive
 */
export function getRegionForCountry(country: string): RegionConfig {
  if (!country) {
    return DEFAULT_REGION;
  }

  const regionConfig = COUNTRY_REGION_MAPPING[country];
  
  if (!regionConfig) {
    console.log(`Region mapping not found for country: ${country}, using default region`);
    return DEFAULT_REGION;
  }

  // If region is not active, fallback to default
  if (!regionConfig.isActive) {
    console.log(`Region for country ${country} is not active, using default region`);
    return DEFAULT_REGION;
  }

  return regionConfig;
}

/**
 * Check if a region is active for a specific country
 */
export function isRegionActive(country: string): boolean {
  if (!country) {
    return true; // Default region is always active
  }

  const region = COUNTRY_REGION_MAPPING[country];
  return region?.isActive ?? false;
}

/**
 * Get all active regions
 */
export function getActiveRegions(): { country: string; config: RegionConfig }[] {
  return Object.entries(COUNTRY_REGION_MAPPING)
    .filter(([, config]) => config.isActive)
    .map(([country, config]) => ({ country, config }));
}

/**
 * Get all countries supported by the system
 */
export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_REGION_MAPPING);
}