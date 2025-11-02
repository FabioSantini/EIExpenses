#!/bin/bash
# Quick Code Deployment Script for EI-Expenses
# Deploys only code changes without rebuilding the entire container
# Usage: ./deploy-code.sh

set -e  # Exit on error

echo "🚀 EI-Expenses - Quick Code Deployment"
echo "========================================"
echo ""

# Configuration
APP_NAME="EIExpenses-Container"
RESOURCE_GROUP="rg-EIExpenses"
DEPLOY_PACKAGE="deploy-code.zip"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Next.js application
echo "📦 Step 1/4: Building Next.js application..."
echo -e "${YELLOW}This will take about 30-60 seconds...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Fix errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
echo ""

# Step 2: Create deployment package
echo "📁 Step 2/4: Creating deployment package..."

# Remove old package if exists
rm -f $DEPLOY_PACKAGE

# Create ZIP with standalone output
# Azure expects files in the root of the ZIP
cd .next/standalone
zip -r ../../$DEPLOY_PACKAGE . -q
cd ../..

# Add static files
cd .next
zip -r ../$DEPLOY_PACKAGE static -q
cd ..

# Add public files
if [ -d "public" ]; then
    zip -r $DEPLOY_PACKAGE public -q
fi

# Get package size
PACKAGE_SIZE=$(du -h $DEPLOY_PACKAGE | cut -f1)
echo -e "${GREEN}✅ Package created: $DEPLOY_PACKAGE ($PACKAGE_SIZE)${NC}"
echo ""

# Step 3: Deploy to Azure
echo "☁️  Step 3/4: Deploying to Azure App Service..."
echo -e "${YELLOW}Uploading package to Azure...${NC}"

az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src $DEPLOY_PACKAGE \
    --timeout 600

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code deployed successfully${NC}"
echo ""

# Step 4: Verify deployment
echo "🔍 Step 4/4: Verifying deployment..."
echo "Waiting for app to restart..."
sleep 10

# Check if site is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$APP_NAME.azurewebsites.net)

if [ $HTTP_CODE -eq 200 ] || [ $HTTP_CODE -eq 307 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🌐 Your app is live at:"
    echo "   https://$APP_NAME.azurewebsites.net"
    echo ""
    echo "📊 Total deployment time: ~2-3 minutes"
else
    echo -e "${YELLOW}⚠️  App deployed but returned HTTP $HTTP_CODE${NC}"
    echo "   Check logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up deployment package..."
rm -f $DEPLOY_PACKAGE
echo -e "${GREEN}✅ Cleanup completed${NC}"

echo ""
echo "================================================"
echo "🎉 Quick deployment completed!"
echo "================================================"
