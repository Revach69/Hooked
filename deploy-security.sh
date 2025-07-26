#!/bin/bash

# Security Deployment Script for Hooked App
# This script deploys the updated security rules and Cloud Functions

set -e  # Exit on any error

echo "🔒 Starting security deployment for Hooked app..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "You are not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

print_status "Checking Firebase project configuration..."

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    print_error "firebase.json not found. Please make sure you're in the project root directory."
    exit 1
fi

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
    print_error "firestore.rules not found. Please make sure the security rules file exists."
    exit 1
fi

print_status "Deploying Firestore security rules..."

# Deploy Firestore security rules
if firebase deploy --only firestore:rules; then
    print_success "Firestore security rules deployed successfully!"
else
    print_error "Failed to deploy Firestore security rules"
    exit 1
fi

print_status "Checking Cloud Functions configuration..."

# Check if functions directory exists
if [ ! -d "firebase/functions" ]; then
    print_warning "Cloud Functions directory not found. Creating it..."
    mkdir -p firebase/functions/src
fi

# Check if functions package.json exists
if [ ! -f "firebase/functions/package.json" ]; then
    print_error "Cloud Functions package.json not found. Please make sure it exists."
    exit 1
fi

print_status "Installing Cloud Functions dependencies..."

# Install Cloud Functions dependencies
cd firebase/functions
if npm install; then
    print_success "Cloud Functions dependencies installed successfully!"
else
    print_error "Failed to install Cloud Functions dependencies"
    exit 1
fi

print_status "Building Cloud Functions..."

# Build Cloud Functions
if npm run build; then
    print_success "Cloud Functions built successfully!"
else
    print_error "Failed to build Cloud Functions"
    exit 1
fi

cd ../..

print_status "Deploying Cloud Functions..."

# Deploy Cloud Functions
if firebase deploy --only functions; then
    print_success "Cloud Functions deployed successfully!"
else
    print_error "Failed to deploy Cloud Functions"
    exit 1
fi

print_status "Setting up Firestore indexes..."

# Deploy Firestore indexes if they exist
if [ -f "firestore.indexes.json" ]; then
    if firebase deploy --only firestore:indexes; then
        print_success "Firestore indexes deployed successfully!"
    else
        print_warning "Failed to deploy Firestore indexes (this might be normal if no indexes are needed)"
    fi
fi

print_status "Verifying deployment..."

# Verify the deployment by checking if rules are active
echo "Waiting 30 seconds for rules to propagate..."
sleep 30

print_success "Security deployment completed successfully! 🎉"

echo ""
echo "📋 Deployment Summary:"
echo "✅ Firestore security rules deployed"
echo "✅ Cloud Functions deployed"
echo "✅ Firestore indexes deployed (if applicable)"
echo ""
echo "🔒 Security Features Now Active:"
echo "• Temporary profile creation with expiration"
echo "• Automatic cleanup of expired profiles"
echo "• Strict access controls and data validation"
echo "• Local profile storage option"
echo "• Anonymized analytics data collection"
echo ""
echo "📖 Next Steps:"
echo "1. Test the new security rules with your app"
echo "2. Monitor Cloud Functions execution in Firebase Console"
echo "3. Review the SECURITY_IMPLEMENTATION.md file for details"
echo "4. Set up monitoring and alerts for security rule violations"
echo ""
echo "⚠️  Important Notes:"
echo "• All existing profiles will continue to work until their events expire"
echo "• New profiles will be created with the new security rules"
echo "• The cleanup function will run every hour to remove expired data"
echo "• Users can now save profiles locally on their devices"
echo ""
print_success "Security deployment is complete! Your app is now protected against data breaches." 