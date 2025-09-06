/**
 * Multi-Region System - Region Utilities
 * 
 * This module provides region mapping and utilities for the multi-region system.
 * It maps countries to their optimal Firebase regions for database, storage, and functions.
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

/**
 * Regional deployment configuration for Firebase Functions
 */
export interface RegionalFunctionsConfig {
  [region: string]: {
    deploymentRegion: string; // Where to deploy functions
    databaseId: string; // Which database to connect to
    storageBucket: string; // Which storage bucket to use
    functionNameSuffix?: string; // Optional suffix for function names
  };
}

/**
 * Functions deployment regions mapping
 * Maps function regions to their database and storage counterparts
 */
export const REGIONAL_FUNCTIONS_CONFIG: RegionalFunctionsConfig = {
  'me-west1': {
    deploymentRegion: 'me-west1',
    databaseId: '(default)',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'hooked-development' 
      ? 'hooked-development.firebasestorage.app' 
      : 'hooked-69.firebasestorage.app'
  },
  'australia-southeast2': {
    deploymentRegion: 'australia-southeast2', 
    databaseId: 'au-southeast2',
    storageBucket: 'hooked-australia'
  },
  'us-central1': {
    deploymentRegion: 'us-central1',
    databaseId: 'us-nam5',
    storageBucket: 'hooked-us-nam5'
  },
  // Consolidated European functions deployment
  'europe-west3': {
    deploymentRegion: 'europe-west3',
    databaseId: 'eu-eur3',
    storageBucket: 'hooked-eu'
  },
  // Active Asia support
  'asia-northeast1': {
    deploymentRegion: 'asia-northeast1',
    databaseId: 'asia-ne1', // asia-northeast1 single-region database
    storageBucket: 'hooked-asia'
  },
  // South America region support
  'southamerica-east1': {
    deploymentRegion: 'southamerica-east1',
    databaseId: 'southamerica-east1',
    storageBucket: 'hooked-southamerica-east1'
  }
};

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
export const COUNTRY_REGION_MAPPING: CountryRegionMapping = {
  // Phase 1: Active Regions (Israel + Australia)
  'Israel': {
    database: '(default)', // me-west1 default database
    storage: 'hooked-69.firebasestorage.app', // me-west1 default storage
    functions: 'me-west1',
    isActive: true,
    displayName: 'Middle East (Israel)',
    latencyOptimizedFor: ['Israel', 'Palestine', 'Lebanon', 'Jordan', 'Syria', 'Cyprus']
  },
  'Australia': {
    database: 'au-southeast2',
    storage: 'hooked-australia', // australia-southeast2 dual-region
    functions: 'australia-southeast2', 
    isActive: true,
    displayName: 'Australia (Sydney)',
    latencyOptimizedFor: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji']
  },

  // Phase 2: Active Multi-Region Support
  'United States': {
    database: 'us-nam5',
    storage: 'hooked-us-nam5', // nam5 multi-region
    functions: 'us-central1', // Primary US functions region
    isActive: true,
    displayName: 'US Multi-Region (NAM5)',
    latencyOptimizedFor: ['United States', 'Mexico']
  },

  // All European countries use the same EU multi-region setup
  'United Kingdom': {
    database: 'eu-eur3',
    storage: 'hooked-eu', // eur3 multi-region 
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['United Kingdom', 'Ireland', 'Iceland']
  },
  'Germany': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Germany', 'Austria', 'Switzerland']
  },
  'France': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['France']
  },
  'Spain': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Spain']
  },
  'Italy': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Italy']
  },

  // Phase 3: Active Asia Region Support
  'Japan': {
    database: 'asia-ne1', // asia-northeast1 single-region database
    storage: 'hooked-asia', // asia multi-region storage
    functions: 'asia-northeast1',
    isActive: true, // Asia database now available
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Japan', 'South Korea']
  },
  'Singapore': {
    database: 'asia-ne1', // All Asia countries use same database
    storage: 'hooked-asia',
    functions: 'asia-northeast1', // Consolidated to single Asia functions region
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines']
  },
  'South Korea': {
    database: 'asia-ne1',
    storage: 'hooked-asia',
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['South Korea']
  },
  'Thailand': {
    database: 'asia-ne1',
    storage: 'hooked-asia',
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Thailand']
  },
  'Malaysia': {
    database: 'asia-ne1',
    storage: 'hooked-asia',
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Malaysia']
  },
  'Indonesia': {
    database: 'asia-ne1',
    storage: 'hooked-asia',
    functions: 'asia-northeast1',
    isActive: true,
    displayName: 'Asia (Tokyo)',
    latencyOptimizedFor: ['Indonesia']
  },

  // Additional countries mapped to nearest active regions
  'New Zealand': {
    database: 'au-southeast2',
    storage: 'hooked-australia',
    functions: 'australia-southeast2',
    isActive: true,
    displayName: 'Australia Dual-Region - Optimized for NZ',
    latencyOptimizedFor: ['New Zealand']
  },
  'Canada': {
    database: 'us-nam5',
    storage: 'hooked-us-nam5',
    functions: 'us-central1', // Use US central for Canada
    isActive: true,
    displayName: 'US Multi-Region (NAM5) - Optimized for Canada',
    latencyOptimizedFor: ['Canada']
  },

  // Additional European countries - all use consolidated EU setup
  'Netherlands': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Netherlands']
  },
  'Belgium': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Belgium']
  },
  'Portugal': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3', // Consolidated EU functions region
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Portugal']
  },
  'Austria': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Austria']
  },
  'Switzerland': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Switzerland']
  },
  'Ireland': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Ireland']
  },
  'Poland': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Poland']
  },
  'Czech Republic': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Czech Republic']
  },
  'Sweden': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Sweden']
  },
  'Norway': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Norway']
  },
  'Denmark': {
    database: 'eu-eur3',
    storage: 'hooked-eu',
    functions: 'europe-west3',
    isActive: true,
    displayName: 'Europe Multi-Region (EUR3)',
    latencyOptimizedFor: ['Denmark']
  },

  // Phase 4: Active South America Region Support
  'Brazil': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Brazil']
  },
  'Argentina': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Argentina']
  },
  'Chile': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Chile']
  },
  'Colombia': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Colombia']
  },
  'Peru': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Peru']
  },
  'Venezuela': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Venezuela']
  },
  'Uruguay': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Uruguay']
  },
  'Paraguay': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Paraguay']
  },
  'Bolivia': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Bolivia']
  },
  'Ecuador': {
    database: 'southamerica-east1',
    storage: 'hooked-southamerica-east1',
    functions: 'southamerica-east1',
    isActive: true,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Ecuador']
  }
};

/**
 * Default Region Configuration (Israel - me-west1)
 * Used as fallback when country is not mapped or region is inactive
 * Respects environment configuration for development/production
 */
export const DEFAULT_REGION: RegionConfig = {
  database: '(default)',
  storage: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'hooked-development' 
    ? 'hooked-development.firebasestorage.app' 
    : 'hooked-69.firebasestorage.app',
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

/**
 * Get region status for admin dashboard
 */
export function getRegionStatus(country: string): {
  region: RegionConfig;
  isActive: boolean;
  isDefault: boolean;
  status: 'active' | 'pending' | 'fallback';
  statusColor: string;
} {
  const region = getRegionForCountry(country);
  const isDefault = region === DEFAULT_REGION;
  const configuredRegion = COUNTRY_REGION_MAPPING[country];
  
  let status: 'active' | 'pending' | 'fallback';
  let statusColor: string;

  if (isDefault && !configuredRegion) {
    status = 'fallback';
    statusColor = 'gray';
  } else if (isDefault && configuredRegion && !configuredRegion.isActive) {
    status = 'pending';
    statusColor = 'yellow';
  } else {
    status = 'active';
    statusColor = 'green';
  }

  return {
    region,
    isActive: region.isActive,
    isDefault,
    status,
    statusColor
  };
}

/**
 * Validate region configuration
 */
export function validateRegionConfig(config: RegionConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.database) {
    errors.push('Database region is required');
  }

  if (!config.storage) {
    errors.push('Storage region is required');
  }

  if (!config.functions) {
    errors.push('Functions region is required');
  }

  if (!config.displayName) {
    errors.push('Display name is required');
  }

  if (!config.latencyOptimizedFor || config.latencyOptimizedFor.length === 0) {
    errors.push('At least one optimized country is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get estimated latency improvement for a country
 * This is a rough estimate based on geographical distance
 */
export function getEstimatedLatencyImprovement(country: string): {
  improvement: number;
  description: string;
} {
  const region = getRegionForCountry(country);
  
  if (region === DEFAULT_REGION) {
    return {
      improvement: 0,
      description: 'Using default region (no improvement)'
    };
  }

  // Rough estimates based on geographical distance from Israel (default region)
  const latencyImprovements: { [key: string]: number } = {
    'Australia': 75, // ~300ms -> ~75ms
    'New Zealand': 75,
    'United States': 70, // ~250ms -> ~75ms
    'Canada': 70,
    'United Kingdom': 60, // ~150ms -> ~60ms
    'Germany': 60,
    'France': 60,
    'Spain': 60,
    'Italy': 60,
    'Brazil': 80, // ~400ms -> ~80ms
    'Japan': 75, // ~300ms -> ~75ms
    'Singapore': 70, // ~250ms -> ~75ms
  };

  const improvement = latencyImprovements[country] || 50;
  
  return {
    improvement,
    description: `Estimated ${improvement}% latency reduction`
  };
}

/**
 * Format region display name with status
 */
export function formatRegionDisplay(country: string): string {
  const status = getRegionStatus(country);
  const statusEmoji = status.status === 'active' ? '🟢' : 
                     status.status === 'pending' ? '🟡' : '🔘';
  
  return `${statusEmoji} ${status.region.displayName}`;
}

/**
 * Get regional functions deployment configuration for a country
 */
export function getFunctionsConfigForCountry(country: string): {
  deploymentRegion: string;
  databaseId: string;
  storageBucket: string;
  functionNameSuffix?: string;
} {
  const region = getRegionForCountry(country);
  const functionsConfig = REGIONAL_FUNCTIONS_CONFIG[region.functions];
  
  if (!functionsConfig) {
    console.warn(`Functions config not found for region ${region.functions}, using default`);
    return REGIONAL_FUNCTIONS_CONFIG['me-west1'];
  }
  
  return functionsConfig;
}

/**
 * Get all supported deployment regions for functions
 */
export function getSupportedFunctionsRegions(): string[] {
  return Object.keys(REGIONAL_FUNCTIONS_CONFIG);
}

/**
 * Get database configuration for Firebase connection
 */
export function getDatabaseConfigForRegion(region: RegionConfig): {
  databaseId: string;
  isDefault: boolean;
} {
  return {
    databaseId: region.database,
    isDefault: region.database === '(default)'
  };
}

/**
 * Get storage bucket configuration for Firebase connection
 */
export function getStorageBucketForRegion(region: RegionConfig): string {
  return region.storage;
}

/**
 * Get all regions that are ready for production use
 */
export function getProductionReadyRegions(): { country: string; config: RegionConfig }[] {
  return Object.entries(COUNTRY_REGION_MAPPING)
    .filter(([, config]) => config.isActive)
    .map(([country, config]) => ({ country, config }));
}