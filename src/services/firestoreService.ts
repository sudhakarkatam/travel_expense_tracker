import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Trip,
  Expense,
  Settlement,
  PackingItem,
  ActivityItem,
  CustomCategory,
  AuditLog,
} from '@/types';
import { storageService } from './storageService';

// Helper function to safely convert date strings to Firestore Timestamps
const safeDateToTimestamp = (dateValue: string | Date | undefined | null): Timestamp | ReturnType<typeof serverTimestamp> => {
  if (!dateValue) {
    return serverTimestamp();
  }
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue, 'using current date');
      return serverTimestamp();
    }
    
    // Check if date is within valid range (year 1000 to year 3000)
    const year = date.getFullYear();
    if (year < 1000 || year > 3000) {
      console.warn('Date out of valid range:', dateValue, 'using current date');
      return serverTimestamp();
    }
    
    return Timestamp.fromDate(date);
  } catch (error) {
    console.error('Error converting date to timestamp:', dateValue, error);
    return serverTimestamp();
  }
};

// Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

export const firestoreService = {
  // ========== TRIPS ==========
  async saveTrips(userId: string, trips: Trip[], uploadImages: boolean = false): Promise<void> {
    if (trips.length === 0) return;
    
    const batch = writeBatch(db);
    
    for (const trip of trips) {
      try {
        let coverImageUrl = trip.coverImage || undefined;
        
        // Upload cover image if it's a local file
        if (uploadImages && coverImageUrl && typeof coverImageUrl === 'string') {
          // Check if it's a local file (file:// or not http/https/data:)
          const isLocalFile = coverImageUrl.startsWith('file://') || 
                             (!coverImageUrl.startsWith('http') && 
                              !coverImageUrl.startsWith('https') && 
                              !coverImageUrl.startsWith('data:'));
          
          if (isLocalFile) {
            console.log(`[Firestore] Detected local cover image for trip ${trip.id}: ${coverImageUrl.substring(0, 60)}...`);
            try {
              // Try Firebase Storage first, automatically falls back to base64 if unavailable
              const uploadResult = await storageService.uploadImage(
                coverImageUrl,
                userId,
                'cover',
                trip.id,
                false // Try Storage first, will auto-fallback to base64
              );
              coverImageUrl = uploadResult.url;
              const storageType = uploadResult.path === 'firestore' ? 'base64 (Firestore)' : 'Firebase Storage';
              console.log(`[Firestore] ✅ Cover image uploaded for trip ${trip.id}`);
              console.log(`[Firestore] Storage type: ${storageType}`);
              console.log(`[Firestore] New URL preview: ${coverImageUrl.substring(0, 60)}...`);
            } catch (error: any) {
              console.error(`[Firestore] ❌ Error uploading cover image for trip ${trip.id}:`, error);
              console.error(`[Firestore] Error details:`, error.message || error);
              // Continue with original URL or undefined (image will remain local)
            }
          } else {
            console.log(`[Firestore] Cover image for trip ${trip.id} already uploaded (${coverImageUrl.substring(0, 60)}...)`);
          }
        }
        
        const tripRef = doc(db, 'users', userId, 'trips', trip.id);
        const tripData = {
          ...trip,
          coverImage: coverImageUrl,
          // Ensure all array fields are initialized
          participants: Array.isArray(trip.participants) ? trip.participants : [],
          // Only include optional fields if they have values
          ...(trip.inviteCode && { inviteCode: trip.inviteCode }),
          notificationsEnabled: trip.notificationsEnabled || false,
          ...(trip.notificationPreferences && { notificationPreferences: trip.notificationPreferences }),
          createdAt: safeDateToTimestamp(trip.createdAt),
          startDate: safeDateToTimestamp(trip.startDate),
          endDate: safeDateToTimestamp(trip.endDate),
          updatedAt: serverTimestamp(),
        };
        // Remove undefined values before saving
        batch.set(tripRef, removeUndefined(tripData));
      } catch (error) {
        console.error(`Error processing trip ${trip.id}:`, error);
        // Skip this trip and continue with others
      }
    }
    await batch.commit();
  },

  async getTrips(userId: string): Promise<Trip[]> {
    try {
      const tripsRef = collection(db, 'users', userId, 'trips');
      const snapshot = await getDocs(tripsRef);
      return snapshot.docs.map((doc) => {
        try {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            startDate: data.startDate?.toDate?.()?.toISOString() || new Date().toISOString(),
            endDate: data.endDate?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as Trip;
        } catch (error) {
          console.error(`Error processing trip document ${doc.id}:`, error);
          // Return trip with fallback dates
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: new Date().toISOString(),
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          } as Trip;
        }
      });
    } catch (error) {
      console.error('Error getting trips:', error);
      return [];
    }
  },

  // ========== EXPENSES ==========
  async saveExpenses(userId: string, expenses: Expense[], uploadImages: boolean = false): Promise<void> {
    if (expenses.length === 0) return;
    
    const batch = writeBatch(db);
    
    for (const expense of expenses) {
      try {
        // Ensure receiptImages is an array
        let receiptImageUrls: string[] = Array.isArray(expense.receiptImages) 
          ? expense.receiptImages 
          : expense.receiptImages 
          ? [expense.receiptImages] 
          : [];
        
        // Upload receipt images if they're local files
        if (uploadImages && receiptImageUrls.length > 0) {
          try {
            // Check for local files (file:// or not http/https/data:)
            const localImages = receiptImageUrls.filter(uri => 
              uri && (uri.startsWith('file://') || 
                     (!uri.startsWith('http') && 
                      !uri.startsWith('https') && 
                      !uri.startsWith('data:')))
            );
            const existingUrls = receiptImageUrls.filter(uri => 
              uri && (uri.startsWith('http') || uri.startsWith('https') || uri.startsWith('data:'))
            );
            
            if (localImages.length > 0) {
              console.log(`[Firestore] Uploading ${localImages.length} receipt image(s) for expense ${expense.id}...`);
              console.log(`[Firestore] Local image paths: ${localImages.map(uri => uri.substring(0, 50)).join(', ')}`);
              
              const uploadedUrls = await storageService.convertLocalImagesToUrls(
                localImages,
                userId,
                'receipt',
                expense.id
              );
              
              receiptImageUrls = [...existingUrls, ...uploadedUrls];
              
              const base64Count = receiptImageUrls.filter(uri => uri?.startsWith('data:')).length;
              const storageCount = receiptImageUrls.filter(uri => uri?.startsWith('https://firebasestorage')).length;
              console.log(`[Firestore] ✅ Receipt images uploaded for expense ${expense.id}`);
              console.log(`[Firestore] Total images: ${receiptImageUrls.length} (${base64Count} base64, ${storageCount} Storage)`);
            } else {
              console.log(`[Firestore] All receipt images already uploaded for expense ${expense.id}`);
            }
          } catch (error: any) {
            console.error(`[Firestore] ❌ Error uploading receipt images for expense ${expense.id}:`, error);
            console.error(`[Firestore] Error details:`, error.message || error);
            // Continue with original URLs
          }
        } else if (receiptImageUrls.length === 0) {
          console.log(`[Firestore] No receipt images to upload for expense ${expense.id}`);
        }
        
        const expenseRef = doc(db, 'users', userId, 'expenses', expense.id);
        const expenseData = {
          ...expense,
          receiptImages: receiptImageUrls,
          // Ensure all array fields are initialized
          splitBetween: Array.isArray(expense.splitBetween) ? expense.splitBetween : [],
          // Only include notes if it has a value
          ...(expense.notes && { notes: expense.notes }),
          date: safeDateToTimestamp(expense.date),
          createdAt: safeDateToTimestamp(expense.createdAt),
          updatedAt: serverTimestamp(),
        };
        // Remove undefined values before saving
        batch.set(expenseRef, removeUndefined(expenseData));
      } catch (error) {
        console.error(`Error processing expense ${expense.id}:`, error);
        // Skip this expense and continue with others
      }
    }
    await batch.commit();
  },

  async getExpenses(userId: string): Promise<Expense[]> {
    try {
      const expensesRef = collection(db, 'users', userId, 'expenses');
      const snapshot = await getDocs(expensesRef);
      return snapshot.docs.map((doc) => {
        try {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as Expense;
        } catch (error) {
          console.error(`Error processing expense document ${doc.id}:`, error);
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          } as Expense;
        }
      });
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  },

  // ========== PACKING ITEMS ==========
  async savePackingItems(userId: string, items: PackingItem[]): Promise<void> {
    if (!items || items.length === 0) return;
    
    const batch = writeBatch(db);
    items.forEach((item) => {
      try {
        const itemRef = doc(db, 'users', userId, 'packingItems', item.id);
        batch.set(itemRef, {
          ...item,
          // Ensure all required fields
          tripId: item.tripId || '',
          name: item.name || '',
          category: item.category || 'Packing List',
          packed: item.packed !== undefined ? item.packed : false,
        });
      } catch (error) {
        console.error(`Error processing packing item ${item.id}:`, error);
      }
    });
    await batch.commit();
  },

  async getPackingItems(userId: string): Promise<PackingItem[]> {
    try {
      const itemsRef = collection(db, 'users', userId, 'packingItems');
      const snapshot = await getDocs(itemsRef);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as PackingItem));
    } catch (error) {
      console.error('Error getting packing items:', error);
      return [];
    }
  },

  // ========== ACTIVITY ITEMS ==========
  async saveActivityItems(userId: string, items: ActivityItem[]): Promise<void> {
    if (!items || items.length === 0) return;
    
    const batch = writeBatch(db);
    items.forEach((item) => {
      try {
        const itemRef = doc(db, 'users', userId, 'activityItems', item.id);
        batch.set(itemRef, {
          ...item,
          // Ensure all required fields
          tripId: item.tripId || '',
          description: item.description || '',
          date: item.date || new Date().toISOString().split('T')[0],
          completed: item.completed !== undefined ? item.completed : false,
        });
      } catch (error) {
        console.error(`Error processing activity item ${item.id}:`, error);
      }
    });
    await batch.commit();
  },

  async getActivityItems(userId: string): Promise<ActivityItem[]> {
    try {
      const itemsRef = collection(db, 'users', userId, 'activityItems');
      const snapshot = await getDocs(itemsRef);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as ActivityItem));
    } catch (error) {
      console.error('Error getting activity items:', error);
      return [];
    }
  },

  // ========== SETTLEMENTS ==========
  async saveSettlements(userId: string, settlements: Settlement[]): Promise<void> {
    if (!settlements || settlements.length === 0) return;
    
    const batch = writeBatch(db);
    settlements.forEach((settlement) => {
      try {
        const settlementRef = doc(db, 'users', userId, 'settlements', settlement.id);
        const settlementData = {
          ...settlement,
          // Ensure all required fields
          tripId: settlement.tripId || '',
          from: settlement.from || '',
          to: settlement.to || '',
          amount: settlement.amount || 0,
          currency: settlement.currency || 'USD',
          settledAt: settlement.settledAt || new Date().toISOString(),
          // Only include notes if it has a value
          ...(settlement.notes && { notes: settlement.notes }),
          date: safeDateToTimestamp(settlement.date || settlement.settledAt),
          createdAt: safeDateToTimestamp(settlement.createdAt),
          updatedAt: serverTimestamp(),
        };
        // Remove undefined values before saving
        batch.set(settlementRef, removeUndefined(settlementData));
      } catch (error) {
        console.error(`Error processing settlement ${settlement.id}:`, error);
        // Skip this settlement and continue with others
      }
    });
    await batch.commit();
  },

  async getSettlements(userId: string): Promise<Settlement[]> {
    try {
      const settlementsRef = collection(db, 'users', userId, 'settlements');
      const snapshot = await getDocs(settlementsRef);
      return snapshot.docs.map((doc) => {
        try {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as Settlement;
        } catch (error) {
          console.error(`Error processing settlement document ${doc.id}:`, error);
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          } as Settlement;
        }
      });
    } catch (error) {
      console.error('Error getting settlements:', error);
      return [];
    }
  },

  // ========== CATEGORIES ==========
  async saveCategories(userId: string, categories: CustomCategory[]): Promise<void> {
    if (!categories || categories.length === 0) return;
    
    const batch = writeBatch(db);
    categories.forEach((category) => {
      try {
        const categoryRef = doc(db, 'users', userId, 'categories', category.id);
        batch.set(categoryRef, {
          ...category,
          // Ensure all required fields
          name: category.name || '',
          color: category.color || '#8b5cf6',
          icon: category.icon || 'pricetag',
          isDefault: category.isDefault !== undefined ? category.isDefault : false,
          createdAt: category.createdAt || new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error processing category ${category.id}:`, error);
      }
    });
    await batch.commit();
  },

  async getCategories(userId: string): Promise<CustomCategory[]> {
    try {
      const categoriesRef = collection(db, 'users', userId, 'categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as CustomCategory));
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  },

  // ========== AUDIT LOGS ==========
  async saveAuditLogs(userId: string, logs: AuditLog[]): Promise<void> {
    if (!logs || logs.length === 0) return;
    
    const batch = writeBatch(db);
    logs.forEach((log) => {
      try {
        const logRef = doc(db, 'users', userId, 'auditLogs', log.id);
        batch.set(logRef, {
          ...log,
          // Ensure all required fields
          entityType: log.entityType || 'trip',
          entityId: log.entityId || '',
          action: log.action || 'created',
          changes: log.changes || {},
          userId: log.userId || userId,
          timestamp: safeDateToTimestamp(log.timestamp),
        });
      } catch (error) {
        console.error(`Error processing audit log ${log.id}:`, error);
        // Skip this log and continue with others
      }
    });
    await batch.commit();
  },

  async getAuditLogs(userId: string): Promise<AuditLog[]> {
    try {
      const logsRef = collection(db, 'users', userId, 'auditLogs');
      const snapshot = await getDocs(logsRef);
      return snapshot.docs.map((doc) => {
        try {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as AuditLog;
        } catch (error) {
          console.error(`Error processing audit log document ${doc.id}:`, error);
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: new Date().toISOString(),
          } as AuditLog;
        }
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  },

  // ========== MERGE GUEST DATA ==========
  async mergeGuestData(
    userId: string,
    localData: {
      trips: Trip[];
      expenses: Expense[];
      packingItems: PackingItem[];
      activityItems: ActivityItem[];
      settlements: Settlement[];
      categories: CustomCategory[];
      auditLogs?: AuditLog[];
    }
  ): Promise<void> {
    try {
      // Get cloud data
      const [
        cloudTrips,
        cloudExpenses,
        cloudPackingItems,
        cloudActivityItems,
        cloudSettlements,
        cloudCategories,
      ] = await Promise.all([
        this.getTrips(userId),
        this.getExpenses(userId),
        this.getPackingItems(userId),
        this.getActivityItems(userId),
        this.getSettlements(userId),
        this.getCategories(userId),
      ]);

      // Merge logic: Combine local and cloud, with cloud taking precedence for conflicts
      const mergedTrips = this.mergeArrays(cloudTrips, localData.trips, 'id');
      const mergedExpenses = this.mergeArrays(cloudExpenses, localData.expenses, 'id');
      const mergedPackingItems = this.mergeArrays(cloudPackingItems, localData.packingItems, 'id');
      const mergedActivityItems = this.mergeArrays(cloudActivityItems, localData.activityItems, 'id');
      const mergedSettlements = this.mergeArrays(cloudSettlements, localData.settlements, 'id');
      const mergedCategories = this.mergeArrays(cloudCategories, localData.categories, 'id');

      // Save merged data to Firestore (without image uploads during merge)
      await Promise.all([
        this.saveTrips(userId, mergedTrips, false),
        this.saveExpenses(userId, mergedExpenses, false),
        this.savePackingItems(userId, mergedPackingItems),
        this.saveActivityItems(userId, mergedActivityItems),
        this.saveSettlements(userId, mergedSettlements),
        this.saveCategories(userId, mergedCategories),
      ]);

      console.log('Guest data merged successfully');
    } catch (error) {
      console.error('Error merging guest data:', error);
      throw error;
    }
  },

  // ========== SYNC ALL DATA TO CLOUD ==========
  async syncAllDataToCloud(
    userId: string,
    data: {
      trips: Trip[];
      expenses: Expense[];
      packingItems: PackingItem[];
      activityItems: ActivityItem[];
      settlements: Settlement[];
      categories: CustomCategory[];
      auditLogs?: AuditLog[];
    },
    uploadImages: boolean = true
  ): Promise<void> {
    try {
      // Ensure all data arrays are defined
      const trips = Array.isArray(data.trips) ? data.trips : [];
      const expenses = Array.isArray(data.expenses) ? data.expenses : [];
      const packingItems = Array.isArray(data.packingItems) ? data.packingItems : [];
      const activityItems = Array.isArray(data.activityItems) ? data.activityItems : [];
      const settlements = Array.isArray(data.settlements) ? data.settlements : [];
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

      // Save all data with image uploads
      await Promise.all([
        this.saveTrips(userId, trips, uploadImages),
        this.saveExpenses(userId, expenses, uploadImages),
        this.savePackingItems(userId, packingItems),
        this.saveActivityItems(userId, activityItems),
        this.saveSettlements(userId, settlements),
        this.saveCategories(userId, categories),
        auditLogs.length > 0 ? this.saveAuditLogs(userId, auditLogs) : Promise.resolve(),
      ]);
      console.log('All data synced to cloud successfully');
    } catch (error) {
      console.error('Error syncing data to cloud:', error);
      throw error;
    }
  },

  // ========== LOAD ALL DATA FROM CLOUD ==========
  async loadAllDataFromCloud(userId: string): Promise<{
    trips: Trip[];
    expenses: Expense[];
    packingItems: PackingItem[];
    activityItems: ActivityItem[];
    settlements: Settlement[];
    categories: CustomCategory[];
    auditLogs: AuditLog[];
  }> {
    try {
      const [trips, expenses, packingItems, activityItems, settlements, categories, auditLogs] = await Promise.all([
        this.getTrips(userId),
        this.getExpenses(userId),
        this.getPackingItems(userId),
        this.getActivityItems(userId),
        this.getSettlements(userId),
        this.getCategories(userId),
        this.getAuditLogs(userId),
      ]);

      return {
        trips,
        expenses,
        packingItems,
        activityItems,
        settlements,
        categories,
        auditLogs,
      };
    } catch (error) {
      console.error('Error loading data from cloud:', error);
      throw error;
    }
  },

  // ========== HELPER: MERGE ARRAYS ==========
  mergeArrays<T extends { id: string }>(cloud: T[] | undefined, local: T[] | undefined, key: keyof T): T[] {
    // Ensure arrays are defined
    const cloudArray = Array.isArray(cloud) ? cloud : [];
    const localArray = Array.isArray(local) ? local : [];
    
    const merged = [...cloudArray];
    const cloudIds = new Set(cloudArray.map((item) => item.id));

    localArray.forEach((item) => {
      if (item && item.id && !cloudIds.has(item.id)) {
        merged.push(item);
      }
    });

    return merged;
  },
};

