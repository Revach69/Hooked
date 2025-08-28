/**
 * Multi-Region System - Region Utilities (Mobile App)
 * 
 * This module provides region mapping and utilities for the multi-region system.
 * It maps countries to their optimal Firebase regions for database, storage, and functions.
 * 
 * Note: This is synchronized with web-admin-hooked/src/lib/regionUtils.ts
 */

export interface RegionConfig {
  database: string;
  storage: string;
  functions: string;
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
 * Phase 1: Initial regions (Israel + Australia)
 * Phase 2: Expansion regions (US, UK, Germany, Canada, Brazil, Japan, Singapore)
 */
export const COUNTRY_REGION_MAPPING: CountryRegionMapping = {
  // Phase 1: Active Regions
  'Israel': {
    database: 'me-west1',
    storage: 'me-west1',
    functions: 'us-central1', // Functions stay in us-central1 for now
    isActive: true,
    displayName: 'Middle East (Israel)',
    latencyOptimizedFor: ['Israel', 'Palestine', 'Lebanon', 'Jordan', 'Syria']
  },
  'Australia': {
    database: 'australia-southeast2',
    storage: 'australia-southeast2',
    functions: 'us-central1', // Functions stay in us-central1 for now
    isActive: true,
    displayName: 'Australia (Sydney)',
    latencyOptimizedFor: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji']
  },

  // Phase 2: Expansion Regions (Inactive until provisioned)
  'United States': {
    database: 'us-central1',
    storage: 'us-central1',
    functions: 'us-central1',
    isActive: false,
    displayName: 'US Central (Iowa)',
    latencyOptimizedFor: ['United States', 'Canada', 'Mexico']
  },
  'United Kingdom': {
    database: 'europe-west2',
    storage: 'europe-west2',
    functions: 'europe-west2',
    isActive: false,
    displayName: 'Europe West (London)',
    latencyOptimizedFor: ['United Kingdom', 'Ireland', 'Iceland']
  },
  'Germany': {
    database: 'europe-west3',
    storage: 'europe-west3',
    functions: 'europe-west3',
    isActive: false,
    displayName: 'Europe West (Frankfurt)',
    latencyOptimizedFor: ['Germany', 'Austria', 'Switzerland', 'Netherlands', 'Belgium']
  },
  'Canada': {
    database: 'northamerica-northeast1',
    storage: 'northamerica-northeast1',
    functions: 'northamerica-northeast1',
    isActive: false,
    displayName: 'North America (Montreal)',
    latencyOptimizedFor: ['Canada']
  },
  'Brazil': {
    database: 'southamerica-east1',
    storage: 'southamerica-east1',
    functions: 'southamerica-east1',
    isActive: false,
    displayName: 'South America (São Paulo)',
    latencyOptimizedFor: ['Brazil', 'Argentina', 'Uruguay', 'Paraguay']
  },
  'Japan': {
    database: 'asia-northeast1',
    storage: 'asia-northeast1',
    functions: 'asia-northeast1',
    isActive: false,
    displayName: 'Asia Northeast (Tokyo)',
    latencyOptimizedFor: ['Japan', 'South Korea']
  },
  'Singapore': {
    database: 'asia-southeast1',
    storage: 'asia-southeast1',
    functions: 'asia-southeast1',
    isActive: false,
    displayName: 'Asia Southeast (Singapore)',
    latencyOptimizedFor: ['Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines']
  },

  // Additional countries mapped to nearest active regions
  'New Zealand': {
    database: 'australia-southeast1',
    storage: 'australia-southeast1',
    functions: 'australia-southeast1',
    isActive: true,
    displayName: 'Australia (Sydney) - Optimized for NZ',
    latencyOptimizedFor: ['New Zealand']
  },
  'France': {
    database: 'europe-west3', // Use Germany region for France
    storage: 'europe-west3',
    functions: 'europe-west3',
    isActive: false,
    displayName: 'Europe West (Frankfurt) - Optimized for France',
    latencyOptimizedFor: ['France']
  },
  'Spain': {
    database: 'europe-west3',
    storage: 'europe-west3',
    functions: 'europe-west3',
    isActive: false,
    displayName: 'Europe West (Frankfurt) - Optimized for Spain',
    latencyOptimizedFor: ['Spain', 'Portugal']
  },
  'Italy': {
    database: 'europe-west3',
    storage: 'europe-west3',
    functions: 'europe-west3',
    isActive: false,
    displayName: 'Europe West (Frankfurt) - Optimized for Italy',
    latencyOptimizedFor: ['Italy']
  }
};

/**
 * Default Region Configuration (Israel - me-west1)
 * Used as fallback when country is not mapped or region is inactive
 */
export const DEFAULT_REGION: RegionConfig = {
  database: 'me-west1',
  storage: 'me-west1',
  functions: 'us-central1',
  isActive: true,
  displayName: 'Default (Middle East - Israel)',
  latencyOptimizedFor: ['Default/Fallback']
};

/**
 * Get region configuration for a specific country
 * Falls back to default region if country is not mapped or region is inactive
 */
export function getRegionForCountry(country?: string | null): RegionConfig {
  if (!country) {
    return DEFAULT_REGION;
  }

  const regionConfig = COUNTRY_REGION_MAPPING[country];
  
  if (!regionConfig) {
    if (__DEV__) {
      console.log(`Region mapping not found for country: ${country}, using default region`);
    }
    return DEFAULT_REGION;
  }

  // If region is not active, fallback to default
  if (!regionConfig.isActive) {
    if (__DEV__) {
      console.log(`Region for country ${country} is not active, using default region`);
    }
    return DEFAULT_REGION;
  }

  return regionConfig;
}

/**
 * Check if a region is active for a specific country
 */
export function isRegionActive(country?: string | null): boolean {
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
 * Get region status for debugging/monitoring
 */
export function getRegionStatus(country?: string | null): {
  region: RegionConfig;
  isActive: boolean;
  isDefault: boolean;
  status: 'active' | 'pending' | 'fallback';
} {
  const region = getRegionForCountry(country);
  const isDefault = region === DEFAULT_REGION;
  const configuredRegion = country ? COUNTRY_REGION_MAPPING[country] : null;
  
  let status: 'active' | 'pending' | 'fallback';

  if (isDefault && !configuredRegion) {
    status = 'fallback';
  } else if (isDefault && configuredRegion && !configuredRegion.isActive) {
    status = 'pending';
  } else {
    status = 'active';
  }

  return {
    region,
    isActive: region.isActive,
    isDefault,
    status
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
export function getEstimatedLatencyImprovement(country?: string | null): {
  improvement: number;
  description: string;
} {
  if (!country) {
    return {
      improvement: 0,
      description: 'Using default region (no improvement)'
    };
  }

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
 * Log region configuration for debugging
 */
export function logRegionDiagnostics(eventCountry?: string | null): void {
  if (!__DEV__) return;

  const status = getRegionStatus(eventCountry);
  const latencyInfo = getEstimatedLatencyImprovement(eventCountry);
  
  console.log('🌍 Region Configuration:', {
    country: eventCountry || 'Default',
    region: status.region.displayName,
    database: status.region.database,
    storage: status.region.storage,
    functions: status.region.functions,
    isActive: status.isActive,
    status: status.status,
    latencyImprovement: latencyInfo.description
  });
}