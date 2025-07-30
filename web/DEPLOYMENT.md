# Deployment Guide for Hooked Web App

## Deploying to Vercel

### Prerequisites
- A Vercel account
- Your repository connected to Vercel

### Steps

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Select the `web` directory as the root directory

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**
   - No environment variables are required as Firebase configuration is hardcoded

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Custom Domain (Optional)
- In your Vercel project settings, go to "Domains"
- Add your custom domain
- Follow the DNS configuration instructions

## Firebase Configuration

The app uses the same Firebase project as the mobile app:
- Project ID: `hooked-69`
- Authentication: Enabled
- Firestore: Enabled
- Storage: Enabled

No additional Firebase configuration is needed for the web deployment.

## Post-Deployment

After deployment, your web app will be available at your Vercel URL and will work seamlessly with your existing Firebase backend.

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed: `npm install`
- Check for import path issues
- Verify Firebase configuration

### Runtime Issues
- Check browser console for errors
- Verify Firebase project permissions
- Ensure Firestore rules allow web access 