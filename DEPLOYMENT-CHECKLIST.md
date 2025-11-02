# Azure Deployment Checklist - EI-Expenses

Complete checklist for deploying EI-Expenses to Azure App Service with Docker container.

## Phase 1: Pre-Deployment Preparation

### 1.1 Environment Configuration
- [ ] Review all environment variables in `.env.local`
- [ ] Prepare production environment variables (don't commit secrets!)
- [ ] Update `NEXTAUTH_URL` to production URL (will be `https://your-app.azurewebsites.net`)
- [ ] Verify `NEXTAUTH_SECRET` is strong and secure
- [ ] Confirm all Azure service credentials are correct
- [ ] Check OpenAI API key has sufficient quota
- [ ] Verify Google Maps API key works for production domain

**Critical Variables for Production:**
```env
# Will be configured in Azure App Service Configuration
NEXTAUTH_URL=https://app-ei-expenses.azurewebsites.net
DATABASE_URL=sqlserver://srveiexpenses.database.windows.net:1433;database=sqlEIExpenses;...
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 1.2 Azure AD Configuration
- [ ] Go to Azure Portal → Azure Active Directory → App Registrations
- [ ] Select EI-Expenses application
- [ ] Navigate to **Authentication** section
- [ ] Add production Redirect URI: `https://your-app.azurewebsites.net/api/auth/callback/azure-ad`
- [ ] Keep existing development URI: `http://localhost:3000/api/auth/callback/azure-ad`
- [ ] Save changes
- [ ] Verify security group membership for authorized users

### 1.3 Database Preparation
- [ ] Review Prisma schema in `prisma/schema.prisma`
- [ ] Check existing migrations in `prisma/migrations/`
- [ ] Verify Azure SQL Database exists (srveiexpenses.database.windows.net)
- [ ] Test connection to Azure SQL from local machine
- [ ] Prepare migration deployment strategy
- [ ] Consider creating seed data if needed

**Test Database Connection:**
```bash
# Test connection string
npx prisma db pull --schema=./prisma/schema.prisma
```

### 1.4 Docker Configuration Review
- [ ] Review `Dockerfile` for production readiness
- [ ] Check `next.config.js` has `output: 'standalone'` for production
- [ ] Verify `.dockerignore` excludes development files
- [ ] Test Docker build locally first
- [ ] Verify image size is reasonable (<500MB recommended)

**Local Docker Test:**
```bash
# Build image locally
docker build -t ei-expenses:test .

# Test run locally
docker run -p 3000:3000 --env-file .env.local ei-expenses:test
```

### 1.5 Code Quality Checks
- [ ] Run TypeScript type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Fix any critical warnings or errors
- [ ] Test critical user flows (login, expense creation, receipt upload)
- [ ] Verify all API routes work correctly
- [ ] Test Excel export functionality

### 1.6 Azure Resources Inventory
Verify these resources exist in Azure Portal:

- [ ] **Resource Group**: `rg-ei-expenses` (or your naming)
- [ ] **SQL Server**: `srveiexpenses.database.windows.net`
  - [ ] Firewall rules allow Azure services
  - [ ] Admin credentials available
- [ ] **SQL Database**: `sqlEIExpenses`
  - [ ] Service tier appropriate (Basic/Standard/Premium)
- [ ] **Storage Account**: `saeiexpenses`
  - [ ] Container `receipts` exists
  - [ ] Access keys available
- [ ] **App Service Plan**: Linux-based, appropriate tier
- [ ] **Container Registry** (optional but recommended): For Docker images

---

## Phase 2: Azure Infrastructure Setup

### 2.1 Create/Verify Azure Container Registry (Recommended)
- [ ] Create Azure Container Registry (ACR) if not exists
- [ ] Name: `acreiexpenses` (must be globally unique)
- [ ] SKU: Basic (sufficient for small apps)
- [ ] Enable Admin user access
- [ ] Note registry login server, username, and password

**Create ACR:**
```bash
az acr create \
  --name acreiexpenses \
  --resource-group rg-ei-expenses \
  --sku Basic \
  --admin-enabled true
```

### 2.2 Create Azure App Service
- [ ] Create Web App with Docker container support
- [ ] Name: `app-ei-expenses` (will be your-app.azurewebsites.net)
- [ ] Runtime: Docker Container (Linux)
- [ ] Region: Same as other resources (West Europe recommended)
- [ ] App Service Plan: B1 or higher (B1 = €12/month)
- [ ] Enable Application Insights (optional but recommended)

**Create App Service:**
```bash
az webapp create \
  --name app-ei-expenses \
  --resource-group rg-ei-expenses \
  --plan <your-app-service-plan> \
  --deployment-container-image-name nginx  # Temporary, will update later
```

### 2.3 Configure App Service Settings
- [ ] Navigate to App Service → Configuration → Application Settings
- [ ] Add all environment variables from Phase 1.1
- [ ] Enable "Always On" (prevents cold starts)
- [ ] Set health check path: `/api/health` (if you have one) or `/`
- [ ] Configure HTTPS Only: Enabled
- [ ] Minimum TLS Version: 1.2

**Add Environment Variables via CLI:**
```bash
az webapp config appsettings set \
  --name app-ei-expenses \
  --resource-group rg-ei-expenses \
  --settings \
    NEXTAUTH_URL="https://app-ei-expenses.azurewebsites.net" \
    DATABASE_URL="<your-database-url>" \
    AZURE_STORAGE_CONNECTION_STRING="<your-connection-string>" \
    # ... add all other variables
```

### 2.4 Configure Networking & Security
- [ ] Verify App Service uses HTTPS
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate if using custom domain
- [ ] Configure CORS if needed (already in .env)
- [ ] Review firewall rules for SQL Database
- [ ] Add App Service outbound IP to SQL firewall if needed

---

## Phase 3: Database Migration

### 3.1 Prepare Migration
- [ ] Backup current Azure SQL Database (if it has data)
- [ ] Review migration SQL in `prisma/migrations/0_init/migration.sql`
- [ ] Test migration against a test database first (recommended)

### 3.2 Run Migration on Azure SQL
**Option A: From Local Machine**
```bash
# Set DATABASE_URL to Azure SQL
export DATABASE_URL="sqlserver://srveiexpenses.database.windows.net:1433;..."

# Run migration
npx prisma migrate deploy
```

**Option B: From Azure Cloud Shell**
- [ ] Upload prisma schema and migrations
- [ ] Run `prisma migrate deploy` from Cloud Shell

### 3.3 Verify Database
- [ ] Connect to Azure SQL with SSMS or Azure Data Studio
- [ ] Verify all tables exist
- [ ] Check table schemas match Prisma models
- [ ] Run seed data if needed: `npm run prisma:seed`

---

## Phase 4: Build & Deploy Container

### 4.1 Build Docker Image
- [ ] Ensure `.env.local` is NOT in the image (check `.dockerignore`)
- [ ] Build production image locally first for testing

**Build Image:**
```bash
# Build for production
docker build -t ei-expenses:latest .

# Tag for ACR
docker tag ei-expenses:latest acreiexpenses.azurecr.io/ei-expenses:latest
```

### 4.2 Push to Azure Container Registry
- [ ] Login to ACR
- [ ] Push Docker image
- [ ] Verify image appears in ACR

**Push Image:**
```bash
# Login to ACR
az acr login --name acreiexpenses

# Push image
docker push acreiexpenses.azurecr.io/ei-expenses:latest
```

### 4.3 Configure App Service to Use Container
- [ ] Navigate to App Service → Deployment Center
- [ ] Source: Azure Container Registry
- [ ] Registry: acreiexpenses
- [ ] Image: ei-expenses
- [ ] Tag: latest
- [ ] Enable Continuous Deployment (optional)

**Via CLI:**
```bash
az webapp config container set \
  --name app-ei-expenses \
  --resource-group rg-ei-expenses \
  --docker-custom-image-name acreiexpenses.azurecr.io/ei-expenses:latest \
  --docker-registry-server-url https://acreiexpenses.azurecr.io \
  --docker-registry-server-user <acr-username> \
  --docker-registry-server-password <acr-password>
```

### 4.4 Deploy & Start Application
- [ ] Restart App Service
- [ ] Monitor startup logs
- [ ] Wait for application to be healthy (2-3 minutes)

**Check Logs:**
```bash
az webapp log tail --name app-ei-expenses --resource-group rg-ei-expenses
```

---

## Phase 5: Post-Deployment Verification

### 5.1 Basic Health Checks
- [ ] Visit `https://app-ei-expenses.azurewebsites.net`
- [ ] Verify home page loads without errors
- [ ] Check browser console for errors
- [ ] Verify static assets load (images, CSS, JS)

### 5.2 Authentication Testing
- [ ] Click "Sign In" button
- [ ] Verify redirect to Azure AD login
- [ ] Login with test user
- [ ] Verify successful callback and redirect
- [ ] Check user session persists
- [ ] Test logout functionality

### 5.3 Feature Testing
- [ ] Create new expense manually
- [ ] Upload receipt image to Azure Blob Storage
- [ ] Verify OCR processing with OpenAI (if enabled)
- [ ] Test fuel expense with Google Maps
- [ ] Create meal expense with customer/colleague
- [ ] Export expenses to Excel
- [ ] Download receipt from storage

### 5.4 Performance & Monitoring
- [ ] Check Application Insights metrics (if enabled)
- [ ] Monitor response times for key pages
- [ ] Check for errors in logs
- [ ] Verify cold start time is acceptable
- [ ] Test under light load (5-10 concurrent users)

### 5.5 Security Verification
- [ ] Verify HTTP redirects to HTTPS
- [ ] Check security headers (Content-Security-Policy, etc.)
- [ ] Verify unauthorized users cannot access protected routes
- [ ] Test security group membership restriction
- [ ] Check no secrets exposed in client-side code
- [ ] Verify CORS settings work correctly

---

## Phase 6: Documentation & Handoff

### 6.1 Update Documentation
- [ ] Update README.md with production URL
- [ ] Document deployment process
- [ ] Create troubleshooting guide
- [ ] Document environment variables
- [ ] Add monitoring/alerting setup

### 6.2 Create Operational Procedures
- [ ] How to update application (CI/CD or manual)
- [ ] How to rollback to previous version
- [ ] How to check logs
- [ ] How to handle database migrations
- [ ] How to scale App Service if needed

### 6.3 Backup & Disaster Recovery
- [ ] Configure automated SQL Database backups
- [ ] Document restore procedure
- [ ] Test database restore process
- [ ] Configure blob storage redundancy (LRS/GRS)
- [ ] Document recovery time objective (RTO)

---

## Phase 7: Optional Enhancements

### 7.1 CI/CD Pipeline (Recommended)
- [ ] Set up GitHub Actions workflow
- [ ] Automate Docker build on push to main
- [ ] Automate push to ACR
- [ ] Automate deployment to App Service
- [ ] Add automated tests in pipeline

### 7.2 Monitoring & Alerting
- [ ] Configure Application Insights alerts
- [ ] Set up availability tests (ping tests)
- [ ] Create dashboard in Azure Portal
- [ ] Configure email alerts for errors
- [ ] Set up cost alerts

### 7.3 Performance Optimization
- [ ] Enable CDN for static assets (optional)
- [ ] Configure Redis cache (optional)
- [ ] Optimize Docker image size
- [ ] Configure autoscaling rules (if needed)

---

## Quick Reference

### Production URLs
- **Application**: `https://app-ei-expenses.azurewebsites.net`
- **Sign In**: `https://app-ei-expenses.azurewebsites.net/auth/signin`
- **API Base**: `https://app-ei-expenses.azurewebsites.net/api`

### Important Azure Resources
- **Resource Group**: `rg-ei-expenses`
- **App Service**: `app-ei-expenses`
- **SQL Server**: `srveiexpenses.database.windows.net`
- **Storage Account**: `saeiexpenses`
- **Container Registry**: `acreiexpenses.azurecr.io`

### Useful Commands
```bash
# Check deployment logs
az webapp log tail --name app-ei-expenses --resource-group rg-ei-expenses

# Restart app
az webapp restart --name app-ei-expenses --resource-group rg-ei-expenses

# Check app settings
az webapp config appsettings list --name app-ei-expenses --resource-group rg-ei-expenses

# Update container image
az webapp config container set --name app-ei-expenses --resource-group rg-ei-expenses \
  --docker-custom-image-name acreiexpenses.azurecr.io/ei-expenses:latest
```

---

## Rollback Plan

If deployment fails or issues arise:

1. **Immediate**: Revert to previous container image tag
   ```bash
   az webapp config container set --name app-ei-expenses \
     --docker-custom-image-name acreiexpenses.azurecr.io/ei-expenses:previous-tag
   ```

2. **Database**: Restore from latest backup if needed
   ```bash
   az sql db restore --dest-name sqlEIExpenses-restored \
     --server srveiexpenses --resource-group rg-ei-expenses \
     --name sqlEIExpenses --time "2025-11-01T12:00:00Z"
   ```

3. **Monitor**: Check logs and Application Insights for issues

---

## Estimated Timeline

- **Phase 1**: 1-2 hours (preparation and verification)
- **Phase 2**: 30-60 minutes (Azure setup)
- **Phase 3**: 15-30 minutes (database migration)
- **Phase 4**: 30-60 minutes (build and deploy)
- **Phase 5**: 1-2 hours (testing and verification)
- **Total**: 4-6 hours for first deployment

**Note**: Subsequent deployments with CI/CD will take 10-15 minutes.

---

## Support Resources

- **Azure Documentation**: https://docs.microsoft.com/azure
- **Next.js Docker**: https://nextjs.org/docs/deployment#docker-image
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **NextAuth.js**: https://next-auth.js.org/deployment

---

**Last Updated**: 2025-11-01
**Version**: 1.0
**Status**: Ready for Production Deployment
