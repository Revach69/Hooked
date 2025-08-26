# Regional Resource Setup Guide
## Firebase Storage Buckets & Database Creation

### 📋 Overview

This guide walks you through creating regional Firebase resources for the multi-region system. Each region will need:
1. **Storage Bucket** - for event images and files
2. **Firestore Database** - for event data and user profiles
3. **Functions** - for backend processing (optional per region)

---

## 🗂️ Storage Bucket Creation

### **Method 1: Firebase Console (Recommended)**

#### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `hooked-69`
3. Navigate to **Storage** in the left sidebar

#### Step 2: Create New Bucket
1. Click the **"Default"** dropdown (next to Storage title)
2. Click **"+ Add bucket"** button
3. Fill in the bucket creation form:

#### **Bucket Creation Form Options:**

| Field | Value | Explanation |
|-------|-------|-------------|
| **Bucket name** | `hooked-events-[region]` | Use format: `hooked-events-australia-southeast1` |
| **Location type** | `Region` | Choose for regional performance |
| **Region** | Select target region | e.g., `australia-southeast1`, `europe-west2` |
| **Storage class** | `Standard` | Best for frequently accessed files |
| **Access control** | `Uniform` | Recommended for Firebase integration |
| **Protection tools** | `None` (for now) | Can add later if needed |

#### **Example Configuration:**
```
Bucket name: hooked-events-australia-southeast1
Location type: Region
Region: australia-southeast1 (Sydney)
Storage class: Standard
Access control: Uniform
Protection tools: None
```

### **Method 2: Google Cloud Console (Advanced)**

#### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `hooked-69`
3. Navigate to **Cloud Storage > Buckets**

#### Step 2: Create Bucket
1. Click **"CREATE"** button
2. Fill in the advanced options:

#### **Advanced Options:**

| Section | Option | Recommended Value | Why |
|---------|--------|-------------------|-----|
| **Name** | Bucket name | `hooked-events-[region]` | Consistent naming |
| **Location type** | Region | `Region` | Regional performance |
| **Region** | Specific region | `australia-southeast1` | Target location |
| **Storage class** | Default storage class | `Standard` | Cost-effective |
| **Access control** | Public access prevention | `Enforce public access prevention` | Security |
| **Object versioning** | Object versioning | `Disabled` | Cost control |
| **Retention policy** | Retention policy | `None` | Flexibility |
| **Labels** | Labels | `environment=prod, region=[region]` | Organization |

---

## 🗄️ Firestore Database Creation

### **Method 1: Firebase Console (Recommended)**

#### Step 1: Access Firestore
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `hooked-69`
3. Navigate to **Firestore Database** in the left sidebar

#### Step 2: Create Additional Database
1. Click **"Add database"** button (if you already have a default database)
2. Or click **"Create database"** (if no database exists)

#### **Database Creation Options:**

| Field | Value | Explanation |
|-------|-------|-------------|
| **Database ID** | `hooked-[region]` | e.g., `hooked-australia-southeast2` |
| **Security rules** | `Start in test mode` | Allows initial setup |
| **Location** | Select target region | e.g., `australia-southeast2 (Sydney)` |

#### **Important Notes:**
- **Multiple databases per project**: You CAN create multiple Firestore databases in the same project
- **Regional databases**: Each database can be in a different region
- **Database ID**: Choose a descriptive name like `hooked-australia-southeast2`
- **Default database**: Your first database remains the default

### **Method 2: Multiple Firestore Databases (Recommended)**

Since Firebase projects CAN have multiple Firestore databases, use this approach:

#### **Database Structure:**
```
Project: hooked-69
├── Default Database: me-west1 (Israel)
│   └── events/ (Israel events)
├── Regional Database: hooked-australia-southeast2 (australia-southeast2)
│   └── events/ (Australia events)
├── Regional Database: hooked-europe-west2 (europe-west2)
│   └── events/ (Europe events)
└── Regional Database: hooked-us-central1 (us-central1)
    └── events/ (US events)
```

#### **Benefits:**
- ✅ **True regional databases**: Data physically in each region
- ✅ **Best performance**: Database in same region as users
- ✅ **Single project**: Unified management and billing
- ✅ **Unified authentication**: Same user base across regions
- ✅ **Data isolation**: Complete separation by region
- ✅ **Regional compliance**: Data stays in specific regions

### **Method 3: Collection-Based Regional Data (Alternative)**

If you prefer to keep everything in one database:

#### **Collection Structure:**
```
events/
├── israel-events/          # Events in Israel (me-west1)
├── australia-events/       # Events in Australia (australia-southeast1)
├── europe-events/          # Events in Europe (europe-west2)
└── us-events/             # Events in US (us-central1)
```

#### **Benefits:**
- ✅ **Single database**: Simpler queries across regions
- ✅ **Cost effective**: One database to manage
- ✅ **Cross-region queries**: Easy to implement

#### **Considerations:**
- ❌ **Database in one region**: All data in me-west1
- ❌ **Higher latency**: For distant regions

---

## ⚙️ Firebase Functions Configuration

### **Functions Region Strategy**

#### **Centralized Functions (Recommended)**
- **Deploy all functions to `us-central1`**
- **Benefits:**
  - ✅ **Simpler deployment**: One region to manage
  - ✅ **Cost effective**: No duplicate function deployments
  - ✅ **Consistent performance**: Functions are lightweight
  - ✅ **Easier debugging**: Single deployment to monitor
  - ✅ **Unified codebase**: Single source of truth for all functions

#### **Why Centralized Functions Work Well:**
- **Functions are lightweight**: Most operations are fast and don't benefit significantly from regional deployment
- **Database and storage are regionalized**: The main latency improvements come from regional data access
- **Functions can access any regional resource**: Functions in `us-central1` can connect to databases and storage in any region
- **Simpler maintenance**: One deployment process, one set of logs, one monitoring dashboard

### **Current Setup Analysis:**
Looking at your buckets, you already have functions in:
- `us-central1` (main functions)
- `europe-west1` (some functions)

**Recommendation**: Keep functions in `us-central1` for simplicity and cost-effectiveness.

---

## 🎯 Implementation Guide

### **One-Time Setup (Done Once)**

#### **Code Implementation (One-Time)**
- [ ] Create `regionUtils.ts` with region mapping
- [ ] Create `firebaseRegionConfig.ts` for dynamic configuration
- [ ] Update `firebaseApi.ts` for region-aware connections
- [ ] Update `EventForm.tsx` for region assignment
- [ ] Update mobile app Firebase configuration
- [ ] Add region utilities to mobile app

#### **Firebase/Google Cloud Setup (One-Time)**
- [ ] Ensure functions are deployed to `us-central1`
- [ ] Set up monitoring and alerting for regional resources
- [ ] Configure billing alerts for regional costs
- [ ] Set up cross-region access permissions (if needed)

#### **Infrastructure Setup (One-Time)**
- [ ] Create automated configuration copying scripts
- [ ] Set up CI/CD for regional resource deployment
- [ ] Configure monitoring dashboards for regional performance
- [ ] Document regional setup procedures

---

### **Per-Region Setup (Done for Each New Region)**

#### **Phase 1: Storage Setup (Per Region)**
- [ ] Create storage bucket in target region
- [ ] **Copy storage security rules** from default bucket
- [ ] **Copy storage CORS configuration** from default bucket
- [ ] **Copy storage lifecycle policies** from default bucket
- [ ] Configure bucket permissions
- [ ] Test file upload/download
- [ ] Update region mapping configuration

#### **Phase 2: Database Setup (Per Region)**
- [ ] Create new Firestore database in target region
- [ ] Set up database ID (e.g., `hooked-australia-southeast2`)
- [ ] **Copy Firestore security rules** from default database
- [ ] **Copy Firestore indexes** from default database
- [ ] **Copy Firestore collections structure** (if needed)
- [ ] Test database connectivity
- [ ] Plan data migration strategy (if needed)

#### **Phase 3: Testing (Per Region)**
- [ ] Create test event in new region
- [ ] Verify file uploads to regional bucket
- [ ] Test database operations in regional database
- [ ] Monitor performance improvements

### **Note: Functions are Centralized**
- ✅ **Functions remain in `us-central1`** for all regions
- ✅ **No additional function setup** required for new regions
- ✅ **Functions can access any regional resource** (database/storage)

---

## 📊 Cost Considerations

### **Storage Costs (per region):**
- **Storage**: $0.026/GB/month
- **Bandwidth**: $0.12/GB (outbound)
- **Operations**: $0.06/100K reads, $0.18/100K writes

### **Database Costs (shared):**
- **Document reads**: $0.06/100K
- **Document writes**: $0.18/100K
- **Document deletes**: $0.02/100K

### **Functions Costs (centralized):**
- **CPU time**: $0.40/million GB-seconds
- **Memory**: $0.0025/GB-second

---

## 🔧 Configuration Examples

### **Region Mapping Configuration:**
```typescript
export const COUNTRY_REGION_MAPPING = {
  'Israel': {
    database: 'me-west1',
    databaseId: '(default)', // Default database
    storage: 'me-west1',
    functions: 'us-central1',
    storageBucket: 'hooked-69.firebasestorage.app',
    isActive: true
  },
  'Australia': {
    database: 'australia-southeast2',
    databaseId: 'hooked-australia-southeast2', // Regional database
    storage: 'australia-southeast2',
    functions: 'us-central1',
    storageBucket: 'hooked-australia-southeast2',
    isActive: true
  }
};
```

### **Firebase Config for Region:**
```typescript
export function getFirebaseConfigForRegion(region: RegionConfig) {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: region.storageBucket, // Use specific bucket
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!
  };
}
```

---

## 🔧 Configuration Copying Guide

### **Why Copy Configurations?**

When creating new regional databases and storage buckets, you need to copy configurations from your default resources to ensure:
- **Consistent security rules** across all regions
- **Proper indexing** for optimal query performance
- **Correct CORS settings** for web app functionality
- **Appropriate lifecycle policies** for cost management

### **Step-by-Step Configuration Copying**

#### **1. Copying Firestore Security Rules**

##### **Method 1: Firebase Console**
1. Go to **Firestore Database** in Firebase Console
2. Select your **default database** (me-west1)
3. Click **"Rules"** tab
4. Copy the entire rules content
5. Switch to your **new regional database**
6. Click **"Rules"** tab
7. Paste the rules and click **"Publish"**

##### **Method 2: Firebase CLI**
```bash
# Export rules from default database
firebase firestore:rules:get --project=hooked-69 > default-rules.rules

# Deploy rules to regional database
firebase firestore:rules:deploy default-rules.rules --project=hooked-69 --database=hooked-australia-southeast2
```

#### **2. Copying Firestore Indexes**

##### **Method 1: Firebase Console**
1. Go to **Firestore Database** in Firebase Console
2. Select your **default database** (me-west1)
3. Click **"Indexes"** tab
4. Note down all composite indexes
5. Switch to your **new regional database**
6. Click **"Indexes"** tab
7. Click **"Add Index"** for each composite index
8. Fill in the same fields and order as the default database

##### **Method 2: Firebase CLI**
```bash
# Export indexes from default database
firebase firestore:indexes:get --project=hooked-69 > default-indexes.json

# Deploy indexes to regional database
firebase firestore:indexes:deploy default-indexes.json --project=hooked-69 --database=hooked-australia-southeast2
```

#### **3. Copying Storage Security Rules**

##### **Method 1: Firebase Console**
1. Go to **Storage** in Firebase Console
2. Select your **default bucket** (`hooked-69.firebasestorage.app`)
3. Click **"Rules"** tab
4. Copy the entire rules content
5. Switch to your **new regional bucket**
6. Click **"Rules"** tab
7. Paste the rules and click **"Publish"**

##### **Method 2: Firebase CLI**
```bash
# Export storage rules from default bucket
firebase storage:rules:get --project=hooked-69 > default-storage-rules.rules

# Deploy storage rules to regional bucket
firebase storage:rules:deploy default-storage-rules.rules --project=hooked-69 --bucket=hooked-australia-southeast2
```

#### **4. Copying Storage CORS Configuration**

##### **Method 1: Google Cloud Console**
1. Go to **Cloud Storage** in Google Cloud Console
2. Select your **default bucket** (`hooked-69.firebasestorage.app`)
3. Go to **"CORS"** tab
4. Copy the CORS configuration
5. Select your **new regional bucket**
6. Go to **"CORS"** tab
7. Paste the CORS configuration and save

##### **Method 2: gsutil CLI**
```bash
# Export CORS from default bucket
gsutil cors get gs://hooked-69.firebasestorage.app > default-cors.json

# Apply CORS to regional bucket
gsutil cors set default-cors.json gs://hooked-australia-southeast2
```

#### **5. Copying Storage Lifecycle Policies**

##### **Method 1: Google Cloud Console**
1. Go to **Cloud Storage** in Google Cloud Console
2. Select your **default bucket** (`hooked-69.firebasestorage.app`)
3. Go to **"Lifecycle"** tab
4. Copy the lifecycle rules
5. Select your **new regional bucket**
6. Go to **"Lifecycle"** tab
7. Add the same lifecycle rules

##### **Method 2: gsutil CLI**
```bash
# Export lifecycle from default bucket
gsutil lifecycle get gs://hooked-69.firebasestorage.app > default-lifecycle.json

# Apply lifecycle to regional bucket
gsutil lifecycle set default-lifecycle.json gs://hooked-australia-southeast2
```

### **Automated Configuration Script**

Create a script to automate the copying process:

```bash
#!/bin/bash
# copy-configs.sh - Copy configurations to new regional resources

PROJECT_ID="hooked-69"
DEFAULT_DATABASE="(default)"
DEFAULT_BUCKET="hooked-69.firebasestorage.app"
NEW_DATABASE="hooked-australia-southeast2"
NEW_BUCKET="hooked-australia-southeast2"

echo "Copying Firestore configurations..."

# Copy Firestore rules
firebase firestore:rules:get --project=$PROJECT_ID > temp-rules.rules
firebase firestore:rules:deploy temp-rules.rules --project=$PROJECT_ID --database=$NEW_DATABASE

# Copy Firestore indexes
firebase firestore:indexes:get --project=$PROJECT_ID > temp-indexes.json
firebase firestore:indexes:deploy temp-indexes.json --project=$PROJECT_ID --database=$NEW_DATABASE

echo "Copying Storage configurations..."

# Copy Storage rules
firebase storage:rules:get --project=$PROJECT_ID > temp-storage-rules.rules
firebase storage:rules:deploy temp-storage-rules.rules --project=$PROJECT_ID --bucket=$NEW_BUCKET

# Copy CORS configuration
gsutil cors get gs://$DEFAULT_BUCKET > temp-cors.json
gsutil cors set temp-cors.json gs://$NEW_BUCKET

# Copy lifecycle policies
gsutil lifecycle get gs://$DEFAULT_BUCKET > temp-lifecycle.json
gsutil lifecycle set temp-lifecycle.json gs://$NEW_BUCKET

# Clean up temporary files
rm temp-*.json temp-*.rules

echo "Configuration copying completed!"
```

### **Verification Checklist**

After copying configurations, verify:

#### **Firestore Verification:**
- [ ] Security rules are identical between databases
- [ ] All composite indexes are created in regional database
- [ ] Test basic read/write operations
- [ ] Verify query performance

#### **Storage Verification:**
- [ ] Security rules are identical between buckets
- [ ] CORS configuration allows web app access
- [ ] Lifecycle policies are applied correctly
- [ ] Test file upload/download operations

---

## 📋 Implementation Summary

### **What You Do Once (One-Time Setup):**
1. **Code Changes**: Update your web admin and mobile app to support regional resources
2. **Infrastructure**: Set up monitoring, automation, and documentation
3. **Functions**: Ensure centralized functions in `us-central1`

### **What You Do for Each New Region:**
1. **Create regional storage bucket** and copy configurations
2. **Create regional Firestore database** and copy configurations  
3. **Test the new regional setup** with a sample event
4. **Monitor performance improvements**

### **Time Investment:**
- **One-time setup**: 2-3 days (code + infrastructure)
- **Per region setup**: 30-60 minutes (mostly automated)
- **Ongoing maintenance**: Minimal (monitoring only)

---

## 🚀 Next Steps

### **Phase 1: One-Time Setup (Week 1)**
1. **Implement code changes** for regional support
2. **Set up monitoring and automation**
3. **Test with existing Australian resources**

### **Phase 2: Per-Region Expansion (As Needed)**
1. **Create new regional resources** using automated scripts
2. **Copy configurations** from default resources
3. **Test and monitor** performance improvements
4. **Scale to additional regions** as demand grows

---

*This guide provides step-by-step instructions for setting up regional Firebase resources. The multiple database approach is recommended for optimal performance and regional compliance.*
