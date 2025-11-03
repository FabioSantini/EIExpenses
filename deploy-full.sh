#!/bin/bash
# Full Container Rebuild and Deployment Script for EI-Expenses
# Rebuilds Docker container, pushes to ACR, and deploys to Azure
# Usage: ./deploy-full.sh [version]

set -e  # Exit on error

echo "🐋 EI-Expenses - Full Container Deployment"
echo "=========================================="
echo ""

# Configuration
APP_NAME="EIExpenses-Container"
RESOURCE_GROUP="rg-EIExpenses"
ACR_NAME="acreiexpenses"
IMAGE_NAME="ei-expenses"

# Get version from argument or use timestamp
VERSION=${1:-$(date +%Y%m%d-%H%M%S)}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🏷️  Deployment version: $VERSION"
echo ""

# Step 1: Build Docker image
echo "📦 Step 1/5: Building Docker image..."
echo -e "${YELLOW}This will take 5-10 minutes...${NC}"

# Get Google Maps API key from .env.local if not set
if [ -z "$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" ]; then
  if [ -f .env.local ]; then
    export NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(grep NEXT_PUBLIC_GOOGLE_MAPS_API_KEY .env.local | cut -d '=' -f2)
    echo "📍 Using Google Maps API key from .env.local"
  fi
fi

docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
  --build-arg NEXT_PUBLIC_APP_URL="https://$APP_NAME.azurewebsites.net" \
  -t $IMAGE_NAME:$VERSION \
  -t $IMAGE_NAME:latest \
  .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Tag for ACR
echo "🏷️  Step 2/5: Tagging image for Azure Container Registry..."

docker tag $IMAGE_NAME:$VERSION $ACR_NAME.azurecr.io/$IMAGE_NAME:$VERSION
docker tag $IMAGE_NAME:latest $ACR_NAME.azurecr.io/$IMAGE_NAME:latest

echo -e "${GREEN}✅ Image tagged${NC}"
echo ""

# Step 3: Login to ACR
echo "🔐 Step 3/5: Logging into Azure Container Registry..."

az acr login --name $ACR_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ACR login failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to ACR${NC}"
echo ""

# Step 4: Push to ACR
echo "☁️  Step 4/5: Pushing images to Azure Container Registry..."
echo -e "${YELLOW}Pushing version $VERSION...${NC}"

docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:$VERSION
docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Push to ACR failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Images pushed to ACR${NC}"
echo ""

# Step 5: Update App Service and restart
echo "🔄 Step 5/5: Updating Azure App Service..."

az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $ACR_NAME.azurecr.io/$IMAGE_NAME:latest \
    --docker-registry-server-url https://$ACR_NAME.azurecr.io

echo ""
echo "🔄 Restarting App Service..."
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ App Service update failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ App Service updated and restarted${NC}"
echo ""

# Step 6: Verify deployment
echo "🔍 Verifying deployment..."
echo "Waiting for app to restart..."
sleep 15

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$APP_NAME.azurewebsites.net)

if [ $HTTP_CODE -eq 200 ] || [ $HTTP_CODE -eq 307 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🌐 Your app is live at:"
    echo "   https://$APP_NAME.azurewebsites.net"
    echo ""
    echo "🏷️  Deployed versions:"
    echo "   - $VERSION"
    echo "   - latest"
    echo ""
    echo "📊 Total deployment time: ~10-15 minutes"
else
    echo -e "${YELLOW}⚠️  App deployed but returned HTTP $HTTP_CODE${NC}"
    echo "   Check logs: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi

echo ""
echo "================================================"
echo "🎉 Full container deployment completed!"
echo "================================================"
echo ""
echo "💡 Tip: For quick code-only changes, use ./deploy-code.sh"
