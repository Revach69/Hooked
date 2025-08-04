# Third-Party Configuration Guide

## 🔧 Required Configurations for Web App

### 1. **Vercel Environment Variables** ✅ CONFIGURED
**Status**: Environment variables are already set in Vercel

**Current Variables**:
- `NEXT_PUBLIC_FIREBASE_API_KEY` ✅
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` ✅
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ✅
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ✅
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` ✅
- `NEXT_PUBLIC_FIREBASE_APP_ID` ✅
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` ✅

**Action**: ✅ No action needed - already configured

### 2. **Firebase Console Configurations** ⚠️ NEEDS VERIFICATION

#### A. **Firebase Authentication - Authorized Domains**
**Location**: Firebase Console → Authentication → Settings → Authorized domains

**Required Domains**:
- `web-1ebfp45m0-roi-revachs-projects.vercel.app` (current deployment)
- `web-psi-eight-50.vercel.app` (your testing domain)
- `localhost` (for local development)

**Action**: Add these domains to the authorized domains list

#### B. **Firebase Storage - CORS Configuration**
**Location**: Firebase Console → Storage → Rules

**Current Status**: ✅ Rules are deployed and configured
**Action**: ✅ No action needed

#### C. **Firestore Database - Security Rules**
**Location**: Firebase Console → Firestore Database → Rules

**Current Status**: ✅ Rules are deployed and configured
**Action**: ✅ No action needed

### 3. **Vercel Project Settings** ⚠️ NEEDS VERIFICATION

#### A. **Authentication Protection**
**Issue**: The app shows "Authentication Required" page
**Location**: Vercel Dashboard → Project Settings → Security

**Action**: 
1. Go to Vercel Dashboard
2. Select your `web` project
3. Go to Settings → Security
4. **Disable** "Password Protection" or "Authentication"
5. Save changes

#### B. **Domain Configuration**
**Current Domains**:
- `web-1ebfp45m0-roi-revachs-projects.vercel.app` (latest)
- `web-psi-eight-50.vercel.app` (your testing domain)

**Action**: Ensure both domains are properly configured

### 4. **Firebase Project Settings** ⚠️ NEEDS VERIFICATION

#### A. **Web App Registration**
**Location**: Firebase Console → Project Settings → General → Your apps

**Action**: 
1. Check if web app is registered
2. If not, add a new web app
3. Use the current domain as the app identifier

#### B. **API Keys and Restrictions**
**Location**: Google Cloud Console → APIs & Services → Credentials

**Action**: 
1. Check if Firebase API key has proper restrictions
2. Ensure the key allows requests from your Vercel domains

### 5. **CORS Configuration** ⚠️ NEEDS VERIFICATION

#### A. **Firebase Storage CORS**
**Current Status**: ✅ Configured via storage.rules
**Action**: ✅ No action needed

#### B. **Firestore CORS**
**Current Status**: ✅ Configured via firestore.rules
**Action**: ✅ No action needed

## 🚨 **Critical Issues to Fix**

### **Priority 1: Vercel Authentication Protection**
This is likely the main issue preventing the app from working.

**Steps**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `web` project
3. Go to **Settings** → **Security**
4. **Disable** any authentication/password protection
5. Redeploy the project

### **Priority 2: Firebase Authorized Domains**
Add your Vercel domains to Firebase Authentication.

**Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com/project/hooked-69)
2. Go to **Authentication** → **Settings** → **Authorized domains**
3. Add these domains:
   - `web-1ebfp45m0-roi-revachs-projects.vercel.app`
   - `web-psi-eight-50.vercel.app`
   - `localhost` (for development)

## 🧪 **Testing Checklist**

After making these changes:

1. **Test Direct URL**: `https://web-1ebfp45m0-roi-revachs-projects.vercel.app/join?code=TEST`
2. **Test Home Page Navigation**: Enter "TEST" code from home page
3. **Check Browser Console**: Look for Firebase connection errors
4. **Test Firebase Connection**: Verify the test event creation works

## 🔍 **Debugging Steps**

If issues persist:

1. **Check Browser Console** for errors
2. **Verify Firebase Connection** in the console logs
3. **Test with Different Domain** if one doesn't work
4. **Check Network Tab** for failed requests

## 📞 **Support**

If you need help with any of these configurations:
- **Vercel**: Check Vercel documentation or support
- **Firebase**: Check Firebase documentation or support
- **CORS Issues**: Check browser console for specific error messages 