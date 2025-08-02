# Vercel Dashboard Configuration Guide

## 🔐 **Complete Step-by-Step Security Setup for Hooked Application**

This guide will walk you through configuring your Vercel projects with all necessary security settings, environment variables, and optimizations.

---

## 📋 **Prerequisites**

- Vercel account with access to your projects
- Firebase project credentials
- Admin access to both `hooked-website` and `web-admin-hooked` projects

---

## 🚀 **Step 1: Access Vercel Dashboard**

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Sign in with your account
3. Select your scope: **Roi Revach's projects**
4. You should see your projects:
   - `hooked-website`
   - `web-admin-hooked`

---

## 🔧 **Step 2: Configure Environment Variables**

### **For Main Website (`hooked-website`)**

1. **Navigate to Project Settings**
   - Click on `hooked-website` project
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

2. **Add Firebase Configuration Variables**
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

### **For Admin Dashboard (`web-admin-hooked`)**

1. **Navigate to Project Settings**
   - Click on `web-admin-hooked` project
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

2. **Add the same Firebase Configuration Variables** (same values as above)

---

## 🛡️ **Step 3: Configure Security Headers**

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
   - Blocks your site from being embedded in iframes

   **X-Content-Type-Options: nosniff**
   - Prevents MIME type sniffing
   - Forces browsers to respect declared content types

   **Referrer-Policy: strict-origin-when-cross-origin**
   - Controls referrer information
   - Balances privacy and functionality

   **Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()**
   - Restricts device permissions
   - Prevents unauthorized access to sensitive features

   **X-DNS-Prefetch-Control: on**
   - Enables DNS prefetching for performance
   - Controlled DNS resolution

   **Strict-Transport-Security: max-age=31536000; includeSubDomains; preload**
   - Enforces HTTPS connections
   - 1-year max age with subdomain inclusion

   **Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src 'self' https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self';**
   - Comprehensive XSS protection
   - Controls resource loading
   - Restricts script execution

---

## 🔄 **Step 4: Configure Redirects**

### **For Admin Dashboard Only**

1. **Navigate to Redirects Configuration**
   - Go to **Settings** tab
   - Click on **Redirects** in the left sidebar

2. **Add Admin Redirect**
   ```
   Source: /admin
   Destination: /admin/login
   Status: 307 (Temporary Redirect)
   ```

### **Important Region Configuration**

**Firebase Database Region**: Your Firestore database is located in **me-west1** (Middle East - West 1) region, not the default US region. This has been configured in all Firebase configuration files for optimal performance and compliance.

**Cloud Functions Region**: Functions are deployed in **us-central1** region as me-west1 is not supported for Cloud Functions. The functions will automatically connect to your Firestore database in me-west1.

---

## ⚙️ **Step 5: Configure Functions (Optional)**

### **For Both Projects**

1. **Navigate to Functions Configuration**
   - Go to **Settings** tab
   - Click on **Functions** in the left sidebar

2. **Set Function Configuration**
   ```
   Function Pattern: app/api/**/*.ts
   Max Duration: 30 seconds
   ```

---

## 🌍 **Step 6: Configure Domains (Optional)**

### **For Main Website**

1. **Navigate to Domains Configuration**
   - Go to **Settings** tab
   - Click on **Domains** in the left sidebar

2. **Add Custom Domain** (if you have one)
   - Enter your domain name
   - Follow DNS configuration instructions

### **For Admin Dashboard**

1. **Current Domain**: `https://admin.hooked-app.com`
2. **Verify DNS Configuration** if needed

---

## 🚀 **Step 7: Deploy Changes**

### **Method 1: Automatic Deployment**
1. Push changes to your Git repository
2. Vercel will automatically deploy the changes

### **Method 2: Manual Redeploy**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **Redeploy** button
4. Wait for deployment to complete

---

## ✅ **Step 8: Verify Configuration**

### **Test Environment Variables**
1. Visit your deployed website
2. Open browser developer tools (F12)
3. Go to **Console** tab
4. Check for any Firebase initialization errors
5. Verify Firebase services are working

### **Test Security Headers**
1. Open browser developer tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Click on any request to your domain
5. Check **Response Headers** section
6. Verify all security headers are present

### **Test Security Features**
1. **Rate Limiting**: Try to create multiple profiles/likes quickly
2. **XSS Protection**: Try to inject scripts in forms
3. **Admin Access**: Verify admin-only routes are protected
4. **Data Validation**: Try to submit invalid data

---

## 🔍 **Step 9: Monitor and Maintain**

### **Set Up Monitoring**
1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Monitor deployment logs
3. **Performance**: Check Core Web Vitals

### **Regular Maintenance**
1. **Update Dependencies**: Regularly update npm packages
2. **Security Audits**: Run `npm audit` regularly
3. **Backup Configuration**: Document all settings

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Environment Variables Not Working**
- Verify variables are set for all environments (Production, Preview, Development)
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

#### **Security Headers Not Applied**
- Verify header syntax is correct
- Check for typos in header names
- Ensure source pattern matches your routes

#### **Build Failures**
- Check build logs in Vercel dashboard
- Verify all dependencies are installed
- Check for TypeScript/ESLint errors

#### **Firebase Connection Issues**
- Verify API keys are correct
- Check Firebase project settings
- Ensure Firebase services are enabled

---

## 📊 **Security Checklist**

### **✅ Environment Variables**
- [ ] Firebase API key configured
- [ ] Firebase project ID set
- [ ] All required variables present
- [ ] Variables set for all environments

### **✅ Security Headers**
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy set
- [ ] Strict-Transport-Security enabled
- [ ] Content-Security-Policy configured

### **✅ Redirects**
- [ ] Admin redirect configured (if applicable)
- [ ] Custom domains set up (if applicable)

### **✅ Functions**
- [ ] Function timeout configured
- [ ] API routes protected

### **✅ Verification**
- [ ] Security headers verified
- [ ] Environment variables working
- [ ] Firebase services connected
- [ ] Rate limiting tested
- [ ] XSS protection verified

---

## 📞 **Support Resources**

### **Vercel Documentation**
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Headers](https://vercel.com/docs/concepts/projects/project-configuration#headers)
- [Vercel Redirects](https://vercel.com/docs/concepts/projects/project-configuration#redirects)

### **Security Resources**
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

### **Contact Information**
- **Vercel Support**: [support.vercel.com](https://support.vercel.com)
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)

---

## 🎯 **Final Notes**

After completing this configuration:

1. **Your application will be significantly more secure**
2. **All Firebase services will be properly configured**
3. **Security headers will protect against common attacks**
4. **Environment variables will be properly managed**

**Security Level: ENHANCED** ✅

Your Hooked application is now protected with industry-standard security measures while maintaining full functionality.

---

**Last Updated**: August 2, 2024
**Next Review**: September 2, 2024 