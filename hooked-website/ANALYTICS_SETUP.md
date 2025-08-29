# Google Analytics Setup Guide

## 📋 **Required Manual Actions:**

### **1. Google Analytics 4 Account:**
✅ **Already Connected** - Firebase project "hooked-69"
- **Measurement ID**: G-6YHKXLN806
- **Property**: Connected to Firebase project

### **2. Google Tag Manager:**
✅ **Already Created** - GTM-5B3NFKRV
- **Container ID**: GTM-5B3NFKRV
- **Status**: Ready for tag configuration

### **3. Environment Configuration:**
✅ **Already Configured** - `.env.local` file created with:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6YHKXLN806
```

## 📊 **Tracked Events:**

### **Page Views:**
- General page visits
- Contact page visits (specific tracking)

### **Event Interactions:**
- Event card clicks (with event name and ID)
- Modal opens (with event name and ID)
- "Join Event" button clicks (with event name and ID)
- Filter usage (event type and location selections)

### **CTA Buttons:**
- All CTA button clicks across the site

### **Social Media:**
- Instagram link clicks
- LinkedIn link clicks

## 🔍 **Viewing Analytics:**

1. Go to your Google Analytics dashboard
2. Navigate to **Reports** → **Engagement** → **Events**
3. You'll see all tracked events with categories:
   - `event_card` - Event card clicks
   - `modal_open` - Modal opens
   - `join_event` - Join Event button clicks
   - `filter` - Filter usage
   - `social_link` - Social media clicks
   - `cta_button` - CTA button clicks

## 🚀 **Deployment:**

After setting up your GA4 account and environment variable, deploy the website to start collecting analytics data.

## 📈 **Key Metrics to Monitor:**

- **Event Engagement**: Which events get the most clicks
- **Conversion Rate**: Card clicks → Join Event clicks
- **Popular Filters**: Most used event types and locations
- **Social Engagement**: Which social platform drives more traffic
- **Page Performance**: Contact page vs other pages
