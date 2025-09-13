/**
 * Fuzzy matching utilities for duplicate detection
 * Implements trigram similarity and string normalization as per PRD Section 8.1
 */

// Normalize email (lowercase, trim)
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Normalize phone to E.164 format (basic implementation)
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Basic E.164 formatting
  if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code
    return `+${digits}`;
  } else if (digits.length > 7) {
    // International number
    return `+${digits}`;
  }
  
  // Return original if can't normalize
  return phone;
}

// Generate trigrams for a string
function generateTrigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().trim();
  const trigrams = new Set<string>();
  
  // Add padding to handle edge cases
  const padded = `  ${normalized}  `;
  
  for (let i = 0; i < padded.length - 2; i++) {
    const trigram = padded.slice(i, i + 3);
    trigrams.add(trigram);
  }
  
  return trigrams;
}

// Calculate trigram similarity between two strings
export function calculateTrigramSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const trigrams1 = generateTrigrams(str1);
  const trigrams2 = generateTrigrams(str2);
  
  // Calculate Jaccard similarity
  const intersection = new Set([...trigrams1].filter(t => trigrams2.has(t)));
  const union = new Set([...trigrams1, ...trigrams2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  // Initialize first row and column
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  // Fill the matrix
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Calculate Levenshtein similarity (normalized to 0-1)
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

// Calculate overall name similarity (combines trigram and Levenshtein)
export function calculateNameSimilarity(name1: string, name2: string): number {
  const trigramScore = calculateTrigramSimilarity(name1, name2);
  const levenshteinScore = calculateLevenshteinSimilarity(name1, name2);
  
  // Weighted average (trigram slightly favored for partial matches)
  return (trigramScore * 0.6) + (levenshteinScore * 0.4);
}

// Calculate venue similarity
export function calculateVenueSimilarity(venue1: string, venue2: string): number {
  if (!venue1 || !venue2) return 0;
  
  // Remove common words that don't add meaning
  const removeCommon = (str: string) => str
    .toLowerCase()
    .replace(/\b(the|a|an|at|in|on|and|or|&|club|venue|hall|center|centre|restaurant|bar|lounge)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const cleaned1 = removeCommon(venue1);
  const cleaned2 = removeCommon(venue2);
  
  return calculateNameSimilarity(cleaned1, cleaned2);
}

// Match types for different similarity algorithms
export type MatchType = 'email' | 'phone' | 'name' | 'venue';

export interface SimilarityResult {
  type: MatchType;
  score: number;
  isExact: boolean;
}

// Calculate similarity between two values based on type
export function calculateSimilarity(
  value1: string | undefined | null,
  value2: string | undefined | null,
  type: MatchType
): SimilarityResult | null {
  if (!value1 || !value2) return null;
  
  switch (type) {
    case 'email': {
      const norm1 = normalizeEmail(value1);
      const norm2 = normalizeEmail(value2);
      const isExact = norm1 === norm2;
      return {
        type,
        score: isExact ? 1.0 : 0,
        isExact
      };
    }
    
    case 'phone': {
      const norm1 = normalizePhone(value1);
      const norm2 = normalizePhone(value2);
      const isExact = norm1 === norm2;
      return {
        type,
        score: isExact ? 1.0 : 0,
        isExact
      };
    }
    
    case 'name': {
      const score = calculateNameSimilarity(value1, value2);
      return {
        type,
        score,
        isExact: score === 1.0
      };
    }
    
    case 'venue': {
      const score = calculateVenueSimilarity(value1, value2);
      return {
        type,
        score,
        isExact: score === 1.0
      };
    }
    
    default:
      return null;
  }
}

// Generate match reason labels for UI display
export function getMatchReasonLabel(similarity: SimilarityResult): string {
  switch (similarity.type) {
    case 'email':
      return similarity.isExact ? 'Same email' : 'Email similarity';
    case 'phone':
      return similarity.isExact ? 'Phone match' : 'Phone similarity';
    case 'name':
      if (similarity.isExact) return 'Same name';
      return `Name similarity ${similarity.score.toFixed(2)}`;
    case 'venue':
      if (similarity.isExact) return 'Same venue';
      return `Venue similarity ${similarity.score.toFixed(2)}`;
    default:
      return 'Match';
  }
}

// Minimum thresholds for considering a match
export const SIMILARITY_THRESHOLDS = {
  email: 1.0,    // Must be exact
  phone: 1.0,    // Must be exact
  name: 0.7,     // 70% similarity threshold
  venue: 0.65    // 65% similarity threshold
} as const;

// Check if similarity meets threshold
export function meetsThreshold(similarity: SimilarityResult): boolean {
  return similarity.score >= SIMILARITY_THRESHOLDS[similarity.type];
}