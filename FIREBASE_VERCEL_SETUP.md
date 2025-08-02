# Firebase & Vercel Setup Guide

## 🚨 **CRITICAL: Your Website Won't Work Without This Setup**

This guide is **ESSENTIAL** for your application to function. Without these configurations, your website will crash and users won't be able to access any features.

---

## 📋 **Prerequisites**

- Firebase project: `hooked-69`
- Vercel account with access to your projects
- Admin access to both `hooked-website` and `web-admin-hooked` projects

---

## 🔥 **Part 1: Firebase Console Setup**

### **Step 1: Access Firebase Console**
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project: **hooked-69**
3. Navigate to **Project Settings** (gear icon)

### **Step 2: Get Firebase Configuration**
1. In **Project Settings**, scroll to **Your apps** section
2. Find your web app or create a new one
3. Copy the configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: "hooked-69.firebaseapp.com",
  projectId: "hooked-69",
  storageBucket: "hooked-69.firebasestorage.app",
  messagingSenderId: "741889428835",
  appId: "1:741889428835:web:d5f88b43a503c9e6351756",
  measurementId: "G-6YHKXLN806"
};
```

### **Step 3: Enable Firebase Services**
1. **Authentication**: Go to Authentication > Sign-in method
   - Enable Email/Password authentication
   - Enable Google authentication (if needed)

2. **Firestore Database**: Go to Firestore Database
   - **IMPORTANT**: Database is located in **me-west1** region (Middle East - West 1)
   - Create database if not exists
   - Set security rules (already deployed)

3. **Storage**: Go to Storage
   - Create storage bucket if not exists
   - Set security rules

4. **Functions**: Go to Functions
   - **IMPORTANT**: Functions are deployed in **us-central1** region (Cloud Functions don't support me-west1)
   - Functions will connect to Firestore database in me-west1 region
   - Verify functions are deployed and running
   - Check logs for any errors

---

## ⚡ **Part 2: Vercel Environment Variables Setup**

### **Step 1: Main Website Configuration**

1. **Access Vercel Dashboard**
   - Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your scope: **Roi Revach's projects**
   - Click on `hooked-website` project

2. **Navigate to Environment Variables**
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add Firebase Environment Variables**
   ```
   Name: EXPO_PUBLIC_FIREBASE_API_KEY
   Value: AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
   Value: hooked-69.firebaseapp.com
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_PROJECT_ID
   Value: hooked-69
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
   Value: hooked-69.firebasestorage.app
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   Value: 741889428835
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_APP_ID
   Value: 1:741889428835:web:d5f88b43a503c9e6351756
   Environment: Production, Preview, Development
   ```

   ```
   Name: EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
   Value: G-6YHKXLN806
   Environment: Production, Preview, Development
   ```

### **Step 2: Admin Dashboard Configuration**

1. **Access Admin Dashboard Project**
   - Go back to Vercel dashboard
   - Click on `web-admin-hooked` project

2. **Add the Same Environment Variables**
   - Go to **Settings** > **Environment Variables**
   - Add the exact same variables as above
   - Make sure to select all environments (Production, Preview, Development)

---

## 🛡️ **Part 3: Security Headers Configuration**

### **For Both Projects**

1. **Navigate to Headers Configuration**
   - Go to **Settings** tab
   - Click on **Headers** in the left sidebar

2. **Add Security Headers**
   ```
   Source: /(.*)
   Headers:
   ```

   **X-Frame-Options: DENY**
   - Prevents clickjacking attacks

   **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing

   **Referrer-Policy: strict-origin-when-cross-origin**
   - Controls referrer information

   **Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()**
   - Restricts device permissions

   **X-DNS-Prefetch-Control: on**
   - Enables DNS prefetching

   **Strict-Transport-Security: max-age=31536000; includeSubDomains; preload**
   - Enforces HTTPS connections

   **Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src 'self' https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';**
   - Comprehensive XSS protection

---

## 🔄 **Part 4: Deploy and Verify**

### **Step 1: Redeploy Projects**
1. **Main Website**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Wait for deployment to complete

2. **Admin Dashboard**
   - Repeat the same process for admin dashboard

### **Step 2: Verify Configuration**
1. **Test Main Website**
   - Visit your deployed website
   - Open browser developer tools (F12)
   - Go to **Console** tab
   - Check for Firebase initialization messages:
     ```
     ✅ Firebase app initialized successfully
     ✅ Firebase services initialized: { auth: true, db: true, storage: true, projectId: 'hooked-69' }
     ```

2. **Test Admin Dashboard**
   - Visit `https://admin.hooked-app.com`
   - Verify Firebase services are working

3. **Test Security Headers**
   - Open browser developer tools (F12)
   - Go to **Network** tab
   - Refresh the page
   - Click on any request to your domain
   - Check **Response Headers** section
   - Verify all security headers are present

---

## 🚨 **Troubleshooting**

### **Common Issues and Solutions**

#### **Issue 1: Firebase Not Initializing**
**Symptoms**: Console shows Firebase errors
**Solution**: 
- Verify all environment variables are set correctly
- Check that variables are set for all environments
- Redeploy after adding variables

#### **Issue 2: Website Shows Blank Page**
**Symptoms**: White screen, no content
**Solution**:
- Check browser console for errors
- Verify Firebase configuration
- Check network tab for failed requests

#### **Issue 3: Functions Not Working**
**Symptoms**: Cloud Functions return errors
**Solution**:
- Check Firebase Console > Functions > Logs
- Verify functions are deployed successfully
- Check function permissions

#### **Issue 4: Security Headers Missing**
**Symptoms**: Headers not appearing in network tab
**Solution**:
- Verify header syntax is correct
- Check for typos in header names
- Ensure source pattern matches your routes

---

## 📊 **Verification Checklist**

### **✅ Environment Variables**
- [ ] All 7 Firebase variables set in Vercel
- [ ] Variables set for all environments (Production, Preview, Development)
- [ ] Variable names match exactly (case-sensitive)
- [ ] Values copied correctly from Firebase Console

### **✅ Security Headers**
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy configured
- [ ] Strict-Transport-Security enabled
- [ ] Content-Security-Policy configured

### **✅ Firebase Services**
- [ ] Authentication enabled
- [ ] Firestore Database created
- [ ] Storage bucket configured
- [ ] Functions deployed and running
- [ ] Security rules deployed

### **✅ Application Functionality**
- [ ] Main website loads without errors
- [ ] Admin dashboard accessible
- [ ] Firebase services initialize successfully
- [ ] No console errors
- [ ] All features working properly

---

## 🔐 **Security Status After Setup**

Once this setup is complete, your application will have:

- **✅ Secure Environment Variables**: No hardcoded credentials
- **✅ Firebase Integration**: All services properly configured
- **✅ Security Headers**: Protection against common attacks
- **✅ HTTPS Enforcement**: Secure connections
- **✅ XSS Protection**: Content Security Policy
- **✅ Clickjacking Protection**: X-Frame-Options

**Security Level: PRODUCTION READY** ✅

---

## 📞 **Support Resources**

### **Firebase Support**
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

### **Vercel Support**
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://support.vercel.com)

### **Emergency Contacts**
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)
- **Vercel Support**: [support.vercel.com](https://support.vercel.com)

---

## ⚠️ **Important Notes**

1. **This setup is REQUIRED** for your application to work
2. **Without these configurations**, users will see errors and the app will crash
3. **Test thoroughly** after making changes
4. **Monitor logs** for any issues
5. **Keep credentials secure** and never commit them to version control

---

**Last Updated**: August 2, 2024
**Next Review**: August 9, 2024
**Status**: **CRITICAL SETUP REQUIRED** 🚨 