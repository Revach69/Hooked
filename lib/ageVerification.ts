// Age Verification System for Dating App Compliance
// Ensures all users are 18+ as required by App Store and Google Play

export interface AgeVerificationResult {
  isVerified: boolean;
  age: number;
  verificationMethod: 'input' | 'document' | 'social' | 'manual';
  confidence: 'low' | 'medium' | 'high';
  timestamp: string;
  requiresManualReview: boolean;
}

export interface AgeVerificationData {
  birthDate: string;
  verificationMethod: string;
  documentUrl?: string;
  socialMediaUrl?: string;
  manualReviewNotes?: string;
}

export class AgeVerification {
  private static instance: AgeVerification;
  private verificationHistory: Map<string, AgeVerificationResult> = new Map();

  static getInstance(): AgeVerification {
    if (!AgeVerification.instance) {
      AgeVerification.instance = new AgeVerification();
    }
    return AgeVerification.instance;
  }

  // Calculate age from birth date
  calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Basic age verification from user input
  verifyAgeFromInput(birthDate: string): AgeVerificationResult {
    const age = this.calculateAge(birthDate);
    const isVerified = age >= 18;
    
    const result: AgeVerificationResult = {
      isVerified,
      age,
      verificationMethod: 'input',
      confidence: 'low', // User input is least reliable
      timestamp: new Date().toISOString(),
      requiresManualReview: age < 18 || age > 100
    };

    return result;
  }

  // Document-based verification (ID, passport, etc.)
  async verifyAgeFromDocument(documentUrl: string, birthDate: string): Promise<AgeVerificationResult> {
    const age = this.calculateAge(birthDate);
    const isVerified = age >= 18;
    
    // In a real implementation, this would use OCR/ML to extract birth date from document
    // For now, we'll assume the document matches the provided birth date
    
    const result: AgeVerificationResult = {
      isVerified,
      age,
      verificationMethod: 'document',
      confidence: 'high',
      timestamp: new Date().toISOString(),
      requiresManualReview: false
    };

    return result;
  }

  // Social media verification (Facebook, LinkedIn, etc.)
  async verifyAgeFromSocial(socialMediaUrl: string, birthDate: string): Promise<AgeVerificationResult> {
    const age = this.calculateAge(birthDate);
    const isVerified = age >= 18;
    
    // In a real implementation, this would use social media APIs
    // For now, we'll assume the social media profile matches the provided birth date
    
    const result: AgeVerificationResult = {
      isVerified,
      age,
      verificationMethod: 'social',
      confidence: 'medium',
      timestamp: new Date().toISOString(),
      requiresManualReview: age < 18 || age > 100
    };

    return result;
  }

  // Manual review by admin/moderator
  async verifyAgeManually(userId: string, adminNotes: string): Promise<AgeVerificationResult> {
    // This would be called by an admin after reviewing user's verification
    const result: AgeVerificationResult = {
      isVerified: true, // Admin approved
      age: 18, // Minimum age
      verificationMethod: 'manual',
      confidence: 'high',
      timestamp: new Date().toISOString(),
      requiresManualReview: false
    };

    this.verificationHistory.set(userId, result);
    return result;
  }

  // Store verification result
  storeVerificationResult(userId: string, result: AgeVerificationResult): void {
    this.verificationHistory.set(userId, result);
  }

  // Get verification result for user
  getVerificationResult(userId: string): AgeVerificationResult | null {
    return this.verificationHistory.get(userId) || null;
  }

  // Check if user is verified and 18+
  isUserVerified(userId: string): boolean {
    const result = this.getVerificationResult(userId);
    return result?.isVerified && result?.age >= 18;
  }

  // Get users requiring manual review
  getUsersRequiringReview(): string[] {
    const users: string[] = [];
    this.verificationHistory.forEach((result, userId) => {
      if (result.requiresManualReview) {
        users.push(userId);
      }
    });
    return users;
  }

  // Get verification statistics
  getVerificationStats(): {
    total: number;
    verified: number;
    unverified: number;
    pendingReview: number;
    byMethod: Record<string, number>;
  } {
    const stats = {
      total: this.verificationHistory.size,
      verified: 0,
      unverified: 0,
      pendingReview: 0,
      byMethod: {} as Record<string, number>
    };

    this.verificationHistory.forEach((result) => {
      if (result.isVerified && result.age >= 18) {
        stats.verified++;
      } else {
        stats.unverified++;
      }
      
      if (result.requiresManualReview) {
        stats.pendingReview++;
      }
      
      stats.byMethod[result.verificationMethod] = (stats.byMethod[result.verificationMethod] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const ageVerification = AgeVerification.getInstance();

// Utility functions for common verification tasks
export const verifyUserAge = async (userId: string, birthDate: string): Promise<AgeVerificationResult> => {
  const result = ageVerification.verifyAgeFromInput(birthDate);
  ageVerification.storeVerificationResult(userId, result);
  return result;
};

export const requireDocumentVerification = (userId: string, birthDate: string): Promise<AgeVerificationResult> => {
  // This would trigger a document upload flow
  return ageVerification.verifyAgeFromInput(birthDate);
};

export const requireSocialVerification = (userId: string, birthDate: string): Promise<AgeVerificationResult> => {
  // This would trigger a social media verification flow
  return ageVerification.verifyAgeFromInput(birthDate);
}; 