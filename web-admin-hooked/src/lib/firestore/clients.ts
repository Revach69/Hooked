import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit,
  startAt,
  endAt,
  QueryConstraint
} from 'firebase/firestore';
import { getDbInstance } from '../firebaseConfig';
import type { AdminClient } from '@/types/admin';
import { 
  calculateSimilarity, 
  normalizeEmail, 
  normalizePhone,
  meetsThreshold,
  getMatchReasonLabel,
  type SimilarityResult,
  type MatchType 
} from '@/lib/utils/fuzzy';

export interface ClientMatch extends AdminClient {
  matchReasons: Array<{
    type: MatchType;
    score?: number;
    label: string;
  }>;
}

export interface DuplicateSearchParams {
  email?: string;
  phone?: string;
  name?: string;
  venue?: string;
}

export interface ClientSearchParams {
  q?: string;
  limit?: number;
  showAll?: boolean;
}

export const AdminClientAPI = {
  async create(data: Omit<AdminClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminClient> {
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'adminClients'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getAll(): Promise<AdminClient[]> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'adminClients'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AdminClient[];
  },

  async get(id: string): Promise<AdminClient | null> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AdminClient;
    }
    return null;
  },

  async update(id: string, data: Partial<AdminClient>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    await updateDoc(docRef, { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', id);
    await deleteDoc(docRef);
  },

  async filter(filters: Partial<AdminClient> = {}): Promise<AdminClient[]> {
    const dbInstance = getDbInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = collection(dbInstance, 'adminClients');
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.source) {
      q = query(q, where('source', '==', filters.source));
    }
    // Note: eventKind filtering is now handled differently since it's per-event
    // This filter is kept for backward compatibility but may not work as expected
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<AdminClient, 'id'>)
    })) as AdminClient[];
  },

  async linkForm(clientId: string, formId: string, formData?: Record<string, unknown>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Create a new event entry for this client based on the form
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      linkedFormId: formId,
      organizerFormSent: 'Yes',
      eventCardCreated: 'No',
      expectedAttendees: formData?.expectedAttendees ? parseInt(formData.expectedAttendees.toString()) : null,
      accessTime: formData?.accessTime || null,
      startTime: formData?.startTime || null,
      endTime: formData?.endTime || null,
      description: formData?.eventDescription || formData?.eventDetails || null,
      eventLink: formData?.eventLink || null,
      eventImage: formData?.eventImage || null,
      eventKind: formData?.eventType || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the new event to the events array
    const updatedEvents = [...currentEvents, newEvent];
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkForm(clientId: string, formId: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Remove the event that has this linkedFormId
    const updatedEvents = currentEvents.filter(event => event.linkedFormId !== formId);
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async linkEvent(clientId: string, eventId: string, eventData?: Record<string, unknown>): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Create a new event entry for this client
    const newEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      linkedEventId: eventId,
      eventCardCreated: 'Yes',
      organizerFormSent: 'No',
      expectedAttendees: eventData?.expectedAttendees || null,
      accessTime: eventData?.accessTime || null,
      startTime: eventData?.startTime || null,
      endTime: eventData?.endTime || null,
      description: eventData?.description || null,
      eventKind: eventData?.eventKind || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the new event to the events array
    const updatedEvents = [...currentEvents, newEvent];
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  async unlinkEvent(clientId: string, eventId: string): Promise<void> {
    const dbInstance = getDbInstance();
    const docRef = doc(dbInstance, 'adminClients', clientId);
    
    // Get the current client data
    const clientDoc = await getDoc(docRef);
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }
    
    const currentClient = clientDoc.data() as AdminClient;
    const currentEvents = currentClient.events || [];
    
    // Remove the event that has this linkedEventId
    const updatedEvents = currentEvents.filter(event => event.linkedEventId !== eventId);
    
    await updateDoc(docRef, { 
      events: updatedEvents,
      updatedAt: serverTimestamp() 
    });
  },

  /**
   * Find potential duplicate clients using fuzzy matching
   * As per PRD Section 8.1 - returns ordered by strongest signals first
   */
  async findDuplicates(params: DuplicateSearchParams): Promise<ClientMatch[]> {
    const { email, phone, name, venue } = params;
    const dbInstance = getDbInstance();
    
    // Build potential matches from different search strategies
    const potentialMatches = new Map<string, AdminClient>();
    
    try {
      // Strategy 1: Exact email match (highest priority)
      if (email) {
        const normalizedEmail = normalizeEmail(email);
        const emailQuery = query(
          collection(dbInstance, 'adminClients'),
          where('email', '==', normalizedEmail),
          limit(50)
        );
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.docs.forEach(doc => {
          const client = { id: doc.id, ...doc.data() } as AdminClient;
          potentialMatches.set(doc.id, client);
        });
      }
      
      // Strategy 2: Exact phone match (high priority)
      if (phone) {
        const normalizedPhone = normalizePhone(phone);
        const phoneQuery = query(
          collection(dbInstance, 'adminClients'),
          where('phone', '==', normalizedPhone),
          limit(50)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        phoneSnapshot.docs.forEach(doc => {
          const client = { id: doc.id, ...doc.data() } as AdminClient;
          potentialMatches.set(doc.id, client);
        });
      }
      
      // Strategy 3: Name-based search (broader scan for fuzzy matching)
      if (name) {
        // Search by pocName field for partial matches
        const nameTokens = name.toLowerCase().split(' ').filter(token => token.length > 2);
        
        for (const token of nameTokens.slice(0, 2)) { // Limit to first 2 tokens to avoid too many queries
          const nameQuery = query(
            collection(dbInstance, 'adminClients'),
            where('pocName', '>=', token),
            where('pocName', '<=', token + '\uf8ff'),
            limit(25)
          );
          const nameSnapshot = await getDocs(nameQuery);
          nameSnapshot.docs.forEach(doc => {
            const client = { id: doc.id, ...doc.data() } as AdminClient;
            potentialMatches.set(doc.id, client);
          });
        }
        
        // Also search by client name
        for (const token of nameTokens.slice(0, 2)) {
          const clientNameQuery = query(
            collection(dbInstance, 'adminClients'),
            where('name', '>=', token),
            where('name', '<=', token + '\uf8ff'),
            limit(25)
          );
          const clientNameSnapshot = await getDocs(clientNameQuery);
          clientNameSnapshot.docs.forEach(doc => {
            const client = { id: doc.id, ...doc.data() } as AdminClient;
            potentialMatches.set(doc.id, client);
          });
        }
      }
      
      // Strategy 4: Get recent clients for broader matching pool
      const recentQuery = query(
        collection(dbInstance, 'adminClients'),
        orderBy('updatedAt', 'desc'),
        limit(100)
      );
      const recentSnapshot = await getDocs(recentQuery);
      recentSnapshot.docs.forEach(doc => {
        const client = { id: doc.id, ...doc.data() } as AdminClient;
        potentialMatches.set(doc.id, client);
      });
      
    } catch (error) {
      console.error('Error fetching potential duplicate clients:', error);
      // Continue with empty matches rather than failing completely
    }
    
    // Convert to array and calculate match scores
    const clients = Array.from(potentialMatches.values());
    const matches: ClientMatch[] = [];
    
    for (const client of clients) {
      const matchReasons: Array<{
        type: MatchType;
        score?: number;
        label: string;
      }> = [];
      
      // Calculate similarities for each field
      const similarities: SimilarityResult[] = [];
      
      if (email && client.email) {
        const similarity = calculateSimilarity(email, client.email, 'email');
        if (similarity && meetsThreshold(similarity)) {
          similarities.push(similarity);
          matchReasons.push({
            type: similarity.type,
            score: similarity.score,
            label: getMatchReasonLabel(similarity)
          });
        }
      }
      
      if (phone && client.phone) {
        const similarity = calculateSimilarity(phone, client.phone, 'phone');
        if (similarity && meetsThreshold(similarity)) {
          similarities.push(similarity);
          matchReasons.push({
            type: similarity.type,
            score: similarity.score,
            label: getMatchReasonLabel(similarity)
          });
        }
      }
      
      if (name && client.pocName) {
        const similarity = calculateSimilarity(name, client.pocName, 'name');
        if (similarity && meetsThreshold(similarity)) {
          similarities.push(similarity);
          matchReasons.push({
            type: similarity.type,
            score: similarity.score,
            label: getMatchReasonLabel(similarity)
          });
        }
      }
      
      if (name && client.name) {
        const similarity = calculateSimilarity(name, client.name, 'name');
        if (similarity && meetsThreshold(similarity)) {
          similarities.push(similarity);
          matchReasons.push({
            type: similarity.type,
            score: similarity.score,
            label: getMatchReasonLabel(similarity)
          });
        }
      }
      
      // Note: venue matching would require additional venue fields in AdminClient
      // This can be extended based on actual client schema
      
      // Only include clients with at least one match
      if (matchReasons.length > 0) {
        matches.push({
          ...client,
          matchReasons
        });
      }
    }
    
    // Sort by match strength (exact matches first, then by number of matches, then by scores)
    matches.sort((a, b) => {
      // Count exact matches
      const aExact = a.matchReasons.filter(r => r.type === 'email' || r.type === 'phone').length;
      const bExact = b.matchReasons.filter(r => r.type === 'email' || r.type === 'phone').length;
      
      if (aExact !== bExact) {
        return bExact - aExact; // More exact matches first
      }
      
      // Count total matches
      if (a.matchReasons.length !== b.matchReasons.length) {
        return b.matchReasons.length - a.matchReasons.length;
      }
      
      // Average match score
      const aAvgScore = a.matchReasons.reduce((sum, r) => sum + (r.score || 1), 0) / a.matchReasons.length;
      const bAvgScore = b.matchReasons.reduce((sum, r) => sum + (r.score || 1), 0) / b.matchReasons.length;
      
      return bAvgScore - aAvgScore;
    });
    
    // Limit results to top 20 matches
    return matches.slice(0, 20);
  },

  /**
   * Search all clients with text query
   * As per PRD Section 8.4 - supports free text search
   */
  async searchClients(params: ClientSearchParams): Promise<AdminClient[]> {
    const { q = '', limit: resultLimit = 50, showAll = false } = params;
    const dbInstance = getDbInstance();
    
    try {
      let clientsQuery = query(collection(dbInstance, 'adminClients'));
      const constraints: QueryConstraint[] = [];
      
      if (!showAll && q) {
        // If we have a search query and not showing all, try to optimize the query
        const searchTerm = q.toLowerCase().trim();
        
        // Try to search by name prefix
        if (searchTerm.length >= 2) {
          constraints.push(
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff')
          );
        }
      }
      
      // Add ordering and limit
      constraints.push(orderBy('updatedAt', 'desc'));
      constraints.push(limit(showAll ? 200 : resultLimit));
      
      if (constraints.length > 0) {
        clientsQuery = query(collection(dbInstance, 'adminClients'), ...constraints);
      } else {
        clientsQuery = query(
          collection(dbInstance, 'adminClients'),
          orderBy('updatedAt', 'desc'),
          limit(showAll ? 200 : resultLimit)
        );
      }
      
      const snapshot = await getDocs(clientsQuery);
      let clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminClient));
      
      // Client-side filtering if we have a query (since Firestore has limited text search)
      if (q && q.trim()) {
        const searchTerm = q.toLowerCase().trim();
        clients = clients.filter(client => {
          const searchableText = [
            client.name,
            client.pocName,
            client.email,
            client.phone
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchableText.includes(searchTerm);
        });
      }
      
      return clients.slice(0, resultLimit);
      
    } catch (error) {
      console.error('Error searching clients:', error);
      return [];
    }
  },

  /**
   * Get a single client by ID
   */
  async getById(clientId: string): Promise<AdminClient | null> {
    const dbInstance = getDbInstance();
    try {
      const docRef = doc(dbInstance, 'adminClients', clientId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as AdminClient;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching client by ID:', error);
      return null;
    }
  },

  /**
   * Validate client exists and is accessible
   */
  async validateAccess(clientId: string): Promise<boolean> {
    try {
      const client = await this.getById(clientId);
      return client !== null;
    } catch {
      return false;
    }
  },

  /**
   * Preview merge operation (dry-run)
   * As per PRD Section 8.3 - returns counts, collisions, and field diff
   */
  async previewMerge(params: { sourceId: string; targetId: string }): Promise<{
    targetClient: AdminClient;
    eventsToMove: number;
    formsToMove: number;
    conflicts: {
      eventCodeCollisions: Array<{
        eventId: string;
        eventCode: string;
        eventName: string;
      }>;
    };
    fieldDifferences: Array<{
      field: keyof AdminClient;
      sourceValue: any;
      targetValue: any;
      recommended: 'source' | 'target' | 'both';
    }>;
  }> {
    const { sourceId, targetId } = params;
    const dbInstance = getDbInstance();

    try {
      // 1. Get both clients
      const [sourceClient, targetClient] = await Promise.all([
        this.getById(sourceId),
        this.getById(targetId)
      ]);

      if (!sourceClient) {
        throw new Error(`Source client ${sourceId} not found`);
      }
      if (!targetClient) {
        throw new Error(`Target client ${targetId} not found`);
      }

      // 2. Region constraint check (PRD Section 8.3)
      if (sourceClient.country !== targetClient.country) {
        const { getRegionForCountry } = await import('@/lib/regionUtils');
        const sourceRegion = getRegionForCountry(sourceClient.country || 'US');
        const targetRegion = getRegionForCountry(targetClient.country || 'US');
        
        if (sourceRegion.database !== targetRegion.database) {
          throw new Error(`Cannot merge clients from different regions. Source is in ${sourceRegion.displayName}, target is in ${targetRegion.displayName}.`);
        }
      }

      // 3. Count events to move
      const { EventAPI } = await import('@/lib/firebaseApi');
      const sourceEvents = await EventAPI.filter({ clientId: sourceId } as any);
      const eventsToMove = sourceEvents.length;

      // 4. Count forms to move
      const { EventFormAPI } = await import('@/lib/firestore/eventForms');
      const sourceForms = await EventFormAPI.filter({ linkedClientId: sourceId });
      const formsToMove = sourceForms.length;

      // 5. Check for event code collisions within the same region
      const eventCodeCollisions: Array<{
        eventId: string;
        eventCode: string;
        eventName: string;
      }> = [];

      // Get all events for target client to check for collisions
      const targetEvents = await EventAPI.filter({ clientId: targetId } as any);
      const targetEventCodes = new Set(targetEvents.map(e => e.event_code));

      for (const sourceEvent of sourceEvents) {
        if (targetEventCodes.has(sourceEvent.event_code)) {
          // Check if events are active/upcoming (per PRD requirements)
          const now = new Date();
          const sourceExpires = sourceEvent.expires_at instanceof Date 
            ? sourceEvent.expires_at 
            : typeof sourceEvent.expires_at === 'string' 
              ? new Date(sourceEvent.expires_at)
              : sourceEvent.expires_at && typeof sourceEvent.expires_at === 'object' && 'toDate' in sourceEvent.expires_at
                ? (sourceEvent.expires_at as any).toDate()
                : new Date();
          
          if (sourceExpires > now) { // Active/upcoming event
            eventCodeCollisions.push({
              eventId: sourceEvent.id,
              eventCode: sourceEvent.event_code,
              eventName: sourceEvent.name
            });
          }
        }
      }

      // 6. Calculate field differences
      const fieldDifferences: Array<{
        field: keyof AdminClient;
        sourceValue: any;
        targetValue: any;
        recommended: 'source' | 'target' | 'both';
      }> = [];

      // Compare relevant fields
      const fieldsToCompare: (keyof AdminClient)[] = [
        'name', 'type', 'pocName', 'email', 'phone', 'country', 'status', 'source', 'adminNotes'
      ];

      for (const field of fieldsToCompare) {
        const sourceValue = sourceClient[field];
        const targetValue = targetClient[field];

        if (sourceValue !== targetValue && sourceValue != null && targetValue != null) {
          let recommended: 'source' | 'target' | 'both' = 'target'; // Default to keep target

          // Apply business rules for recommendations
          if (field === 'email' || field === 'phone') {
            // For contact fields, offer "keep both" option
            recommended = 'both';
          } else if (field === 'status') {
            // Prefer higher status (Won > Pipeline > Lead)
            const statusPriority = { 'Won': 3, 'Pipeline': 2, 'Lead': 1 };
            const sourcePriority = statusPriority[sourceValue as keyof typeof statusPriority] || 0;
            const targetPriority = statusPriority[targetValue as keyof typeof statusPriority] || 0;
            recommended = sourcePriority > targetPriority ? 'source' : 'target';
          } else if (field === 'adminNotes') {
            // For notes, typically want to combine them
            recommended = 'both';
          }

          fieldDifferences.push({
            field,
            sourceValue,
            targetValue,
            recommended
          });
        }
      }

      return {
        targetClient,
        eventsToMove,
        formsToMove,
        conflicts: {
          eventCodeCollisions
        },
        fieldDifferences
      };

    } catch (error) {
      console.error('Error previewing merge:', error);
      throw error;
    }
  },

  /**
   * Merge clients atomically
   * As per PRD Section 8.2 - transaction/batched writes with audit trail
   */
  async mergeClients(params: {
    sourceId: string;
    targetId: string;
    fieldOverrides?: Partial<AdminClient>;
    keepBothOptions?: {
      email: boolean;
      phone: boolean;
    };
    actor?: string; // Admin performing the merge
  }): Promise<{
    success: boolean;
    movedEvents: number;
    movedForms: number;
    auditId: string;
  }> {
    const { sourceId, targetId, fieldOverrides = {}, keepBothOptions = { email: false, phone: false }, actor = 'admin' } = params;
    const dbInstance = getDbInstance();

    try {
      // 1. Read Source and Target clients
      const [sourceClient, targetClient] = await Promise.all([
        this.getById(sourceId),
        this.getById(targetId)
      ]);

      if (!sourceClient) {
        throw new Error(`Source client ${sourceId} not found`);
      }
      if (!targetClient) {
        throw new Error(`Target client ${targetId} not found`);
      }

      // 2. Read Events and Forms to move
      const { EventAPI } = await import('@/lib/firebaseApi');
      const { EventFormAPI } = await import('@/lib/firestore/eventForms');
      
      const [sourceEvents, sourceForms] = await Promise.all([
        EventAPI.filter({ clientId: sourceId } as any),
        EventFormAPI.filter({ linkedClientId: sourceId })
      ]);

      // 3. Build merged target document
      const mergedTargetData: Partial<AdminClient> = {
        ...fieldOverrides,
        updatedAt: new Date()
      };

      // Handle "keep both" options for email/phone
      if (keepBothOptions.email && sourceClient.email && targetClient.email && sourceClient.email !== targetClient.email) {
        const alternateEmails = targetClient.alternateEmails || [];
        if (!alternateEmails.includes(sourceClient.email)) {
          mergedTargetData.alternateEmails = [...alternateEmails, sourceClient.email];
        }
      }

      if (keepBothOptions.phone && sourceClient.phone && targetClient.phone && sourceClient.phone !== targetClient.phone) {
        const alternatePhones = targetClient.alternatePhones || [];
        if (!alternatePhones.includes(sourceClient.phone)) {
          mergedTargetData.alternatePhones = [...alternatePhones, sourceClient.phone];
        }
      }

      // Handle admin notes combination
      if (fieldOverrides.adminNotes === undefined && sourceClient.adminNotes) {
        const existingNotes = targetClient.adminNotes || '';
        mergedTargetData.adminNotes = existingNotes + 
          (existingNotes ? '\n---\n' : '') + 
          `Merged from ${sourceClient.name}: ${sourceClient.adminNotes}`;
      }

      // Add to mergedFrom array
      const mergedFrom = targetClient.mergedFrom || [];
      if (!mergedFrom.includes(sourceId)) {
        mergedTargetData.mergedFrom = [...mergedFrom, sourceId];
      }

      // 4. Create audit entry
      const auditEntry = {
        ts: Date.now(),
        actor,
        action: 'merge' as const,
        details: {
          sourceId,
          targetId,
          movedEvents: sourceEvents.length,
          movedForms: sourceForms.length,
          fieldOverrides,
          keepBothOptions
        }
      };

      const existingAudit = targetClient.audit || [];
      mergedTargetData.audit = [...existingAudit, auditEntry];

      // 5. Perform batched writes (chunked for large operations)
      const BATCH_SIZE = 400; // Firestore limit
      let totalOperations = 0;

      // Update target client
      await this.update(targetId, mergedTargetData);
      totalOperations++;

      // Update events in chunks
      for (let i = 0; i < sourceEvents.length; i += BATCH_SIZE) {
        const eventChunk = sourceEvents.slice(i, i + BATCH_SIZE);
        const updatePromises = eventChunk.map(event => 
          EventAPI.update(event.id, { clientId: targetId } as any)
        );
        await Promise.all(updatePromises);
        totalOperations += eventChunk.length;
      }

      // Update forms in chunks
      for (let i = 0; i < sourceForms.length; i += BATCH_SIZE) {
        const formChunk = sourceForms.slice(i, i + BATCH_SIZE);
        const updatePromises = formChunk.map(form => 
          EventFormAPI.update(form.id, { linkedClientId: targetId })
        );
        await Promise.all(updatePromises);
        totalOperations += formChunk.length;
      }

      // 6. Write to global audit collection
      const globalAuditData = {
        ...auditEntry,
        id: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const globalAuditRef = await addDoc(collection(dbInstance, 'admin_audit'), globalAuditData);

      // 7. Hard delete source client (after all other operations succeed)
      await this.delete(sourceId);

      console.log(`✅ Merge completed: ${sourceClient.name} → ${targetClient.name}`, {
        movedEvents: sourceEvents.length,
        movedForms: sourceForms.length,
        totalOperations,
        auditId: globalAuditRef.id
      });

      return {
        success: true,
        movedEvents: sourceEvents.length,
        movedForms: sourceForms.length,
        auditId: globalAuditRef.id
      };

    } catch (error) {
      console.error('❌ Merge operation failed:', error);
      throw error;
    }
  }
};
