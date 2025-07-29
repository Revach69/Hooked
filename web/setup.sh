#!/bin/bash

echo "🚀 Setting up Hooked Web App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cat > .env.local << EOF
# Firebase Configuration
# Replace these with your actual Firebase project values
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
EOF
    echo "⚠️  Please update .env.local with your actual Firebase configuration values"
else
    echo "✅ .env.local already exists"
fi

# Copy images from mobile app (if available)
if [ -f "../assets/Home Icon.png" ]; then
    echo "📸 Copying images from mobile app..."
    cp "../assets/Home Icon.png" "./public/home-icon.png"
    cp "../assets/Hooked.png" "./public/hooked-logo.png"
    echo "✅ Images copied successfully"
else
    echo "⚠️  Mobile app assets not found. Please manually copy images to public/ directory"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your Firebase configuration"
echo "2. Copy app images to public/ directory"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "For deployment:"
echo "1. Push to GitHub/GitLab"
echo "2. Connect to Vercel"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Deploy!"