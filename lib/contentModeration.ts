// Content Moderation System for Hooked Dating App
// Ensures compliance with App Store guidelines and dating app safety requirements

export interface ContentViolation {
  type: 'inappropriate_language' | 'harassment' | 'spam' | 'inappropriate_photo' | 'underage' | 'commercial' | 'fake_profile';
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  userId?: string;
  eventId?: string;
  timestamp: string;
}

export interface ReportData {
  id: string;
  reporterId: string;
  reportedUserId: string;
  eventId: string;
  reason: ReportReason;
  description: string;
  evidence?: string; // Screenshot or message content
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  moderatorNotes?: string;
}

export type ReportReason = 
  | 'inappropriate_behavior'
  | 'harassment'
  | 'fake_profile'
  | 'spam'
  | 'inappropriate_content'
  | 'underage_user'
  | 'commercial_activity'
  | 'other';

// Inappropriate content patterns for dating app
const INAPPROPRIATE_PATTERNS = [
  // Explicit sexual content (still prohibited)
  /\b(nude|naked|porn|pornography|adult|erotic)\b/i,
  // Profanity
  /\b(fuck|shit|bitch|asshole|dick|pussy|cunt)\b/i,
  // Harassment patterns
  /\b(kill yourself|kys|die|hate you|fuck you)\b/i,
  // Commercial activity
  /\b(buy|sell|price|cost|money|payment|business|promote|advertise)\b/i,
  // Contact information sharing
  /\b(phone|number|email|address|instagram|snapchat|facebook|twitter)\b/i,
  // Age-related inappropriate content
  /\b(underage|minor|teen|young)\b/i,
];

// Spam patterns
const SPAM_PATTERNS = [
  /\b(click here|visit|website|link|url|http|www)\b/i,
  /\b(free|discount|offer|limited time|act now)\b/i,
  /\b(earn money|make money|work from home|investment)\b/i,
];

// Commercial activity patterns (still prohibited in dating context)
const COMMERCIAL_PATTERNS = [
  /\b(buy|sell|price|cost|money|payment|promote|advertise)\b/i,
  /\b(service|product|client|customer|marketing|sales)\b/i,
  /\b(hire|work|job|employment|career)\b/i,
];

export class ContentModeration {
  private static instance: ContentModeration;
  private violations: ContentViolation[] = [];
  private reports: ReportData[] = [];

  static getInstance(): ContentModeration {
    if (!ContentModeration.instance) {
      ContentModeration.instance = new ContentModeration();
    }
    return ContentModeration.instance;
  }

  // Text content validation
  validateTextContent(content: string, context: 'bio' | 'message' | 'name'): {
    isValid: boolean;
    violations: ContentViolation[];
    filteredContent?: string;
  } {
    const violations: ContentViolation[] = [];
    let filteredContent = content;

    // Check for inappropriate patterns
    for (const pattern of INAPPROPRIATE_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          type: 'inappropriate_language',
          severity: 'high',
          content: content,
          timestamp: new Date().toISOString()
        });
        // Replace inappropriate content with asterisks
        filteredContent = filteredContent.replace(pattern, '***');
      }
    }

    // Check for spam patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          type: 'spam',
          severity: 'medium',
          content: content,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for commercial activity
    for (const pattern of COMMERCIAL_PATTERNS) {
      if (pattern.test(content)) {
        violations.push({
          type: 'commercial',
          severity: 'medium',
          content: content,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Length restrictions
    if (context === 'bio' && content.length > 500) {
      violations.push({
        type: 'spam',
        severity: 'low',
        content: content,
        timestamp: new Date().toISOString()
      });
      filteredContent = content.substring(0, 500);
    }

    if (context === 'message' && content.length > 1000) {
      violations.push({
        type: 'spam',
        severity: 'low',
        content: content,
        timestamp: new Date().toISOString()
      });
      filteredContent = content.substring(0, 1000);
    }

    return {
      isValid: violations.length === 0,
      violations,
      filteredContent: violations.length > 0 ? filteredContent : undefined
    };
  }

  // Age validation
  validateAge(age: number): {
    isValid: boolean;
    violation?: ContentViolation;
  } {
    if (age < 18) {
      return {
        isValid: false,
        violation: {
          type: 'underage',
          severity: 'critical',
          content: `Age: ${age}`,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (age > 100) {
      return {
        isValid: false,
        violation: {
          type: 'fake_profile',
          severity: 'medium',
          content: `Age: ${age}`,
          timestamp: new Date().toISOString()
        }
      };
    }

    return { isValid: true };
  }

  // Photo validation (basic checks)
  validatePhoto(photoUrl: string): {
    isValid: boolean;
    violation?: ContentViolation;
  } {
    // Check file size (if available)
    // Check file type
    // Check for inappropriate content (would need AI/ML service)
    
    // For now, basic validation
    if (!photoUrl || photoUrl.length === 0) {
      return { isValid: true }; // No photo is valid
    }

    // Check if it's a valid URL
    try {
      new URL(photoUrl);
    } catch {
      return {
        isValid: false,
        violation: {
          type: 'inappropriate_photo',
          severity: 'medium',
          content: 'Invalid photo URL',
          timestamp: new Date().toISOString()
        }
      };
    }

    return { isValid: true };
  }

  // Create a report
  async createReport(reportData: Omit<ReportData, 'id' | 'createdAt'>): Promise<ReportData> {
    const report: ReportData = {
      ...reportData,
      id: this.generateReportId(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    this.reports.push(report);
    
    // In a real implementation, this would save to Firestore
    console.log('Report created:', report);
    
    return report;
  }

  // Get reports for moderation
  getReports(status?: ReportData['status']): ReportData[] {
    if (status) {
      return this.reports.filter(report => report.status === status);
    }
    return this.reports;
  }

  // Update report status
  async updateReportStatus(reportId: string, status: ReportData['status'], moderatorNotes?: string): Promise<void> {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.status = status;
      report.reviewedAt = new Date().toISOString();
      if (moderatorNotes) {
        report.moderatorNotes = moderatorNotes;
      }
    }
  }

  // Get violation statistics
  getViolationStats(): {
    total: number;
    byType: Record<ContentViolation['type'], number>;
    bySeverity: Record<ContentViolation['severity'], number>;
  } {
    const stats = {
      total: this.violations.length,
      byType: {} as Record<ContentViolation['type'], number>,
      bySeverity: {} as Record<ContentViolation['severity'], number>
    };

    this.violations.forEach(violation => {
      stats.byType[violation.type] = (stats.byType[violation.type] || 0) + 1;
      stats.bySeverity[violation.severity] = (stats.bySeverity[violation.severity] || 0) + 1;
    });

    return stats;
  }

  // Generate unique report ID
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add violation to tracking
  addViolation(violation: ContentViolation): void {
    this.violations.push(violation);
  }

  // Get violations for a specific user
  getUserViolations(userId: string): ContentViolation[] {
    return this.violations.filter(v => v.userId === userId);
  }

  // Check if user should be flagged for review
  shouldFlagUserForReview(userId: string): boolean {
    const userViolations = this.getUserViolations(userId);
    const criticalViolations = userViolations.filter(v => v.severity === 'critical');
    const highViolations = userViolations.filter(v => v.severity === 'high');
    
    return criticalViolations.length > 0 || highViolations.length >= 3;
  }
}

// Export singleton instance
export const contentModeration = ContentModeration.getInstance();

// Utility functions for common validation tasks
export const validateUserProfile = (profile: {
  first_name: string;
  age: number;
  bio?: string;
  interests?: string[];
  profile_photo_url?: string;
}) => {
  const violations: ContentViolation[] = [];
  
  // Validate name
  const nameValidation = contentModeration.validateTextContent(profile.first_name, 'name');
  if (!nameValidation.isValid) {
    violations.push(...nameValidation.violations);
  }

  // Validate age
  const ageValidation = contentModeration.validateAge(profile.age);
  if (!ageValidation.isValid && ageValidation.violation) {
    violations.push(ageValidation.violation);
  }

  // Validate bio
  if (profile.bio) {
    const bioValidation = contentModeration.validateTextContent(profile.bio, 'bio');
    if (!bioValidation.isValid) {
      violations.push(...bioValidation.violations);
    }
  }

  // Validate interests
  if (profile.interests) {
    for (const interest of profile.interests) {
      const interestValidation = contentModeration.validateTextContent(interest, 'bio');
      if (!interestValidation.isValid) {
        violations.push(...interestValidation.violations);
      }
    }
  }

  // Validate photo
  if (profile.profile_photo_url) {
    const photoValidation = contentModeration.validatePhoto(profile.profile_photo_url);
    if (!photoValidation.isValid && photoValidation.violation) {
      violations.push(photoValidation.violation);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    shouldFlagForReview: contentModeration.shouldFlagUserForReview(profile.first_name)
  };
};

export const validateMessage = (message: string) => {
  return contentModeration.validateTextContent(message, 'message');
}; 