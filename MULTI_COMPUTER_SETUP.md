# Multi-Computer Development Setup Guide

## Quick Sync Between Computers

### On Computer A (After Making Changes):
```bash
# Stage and commit your changes
git add .
git commit -m "Your commit message"

# Push to remote
git push origin master
```

### On Computer B (Before Starting Work):
```bash
# Always pull latest changes first
git pull --rebase origin master

# Install any new dependencies
npm install

# Copy environment variables if needed (first time only)
cp .env.example .env.local

# Clear Next.js cache if you see issues
rm -rf .next

# Start development
npm run dev
```

## Important Files for Each Computer

### Files That Stay Local (Not in Git):
- `.env.local` - Your personal environment variables
- `node_modules/` - Installed packages
- `.next/` - Build cache
- `prisma/*.db` - Local SQLite database
- `.vscode/settings.json` - Your personal VS Code settings

### Files That Are Shared (In Git):
- All source code
- `package.json` - Dependencies list
- `prisma/schema.prisma` - Database schema
- `.env.example` - Template for environment variables
- Documentation files

## Setting Up on a New Computer

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/EI-Expenses.git
cd EI-Expenses
```

### 2. Install Node.js (Match Version)
```bash
# Check required version
cat .nvmrc
# Output: 20.11.0

# If using nvm (recommended):
nvm install 20.11.0
nvm use 20.11.0

# Or download from nodejs.org
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your settings
# For development, just keep:
# NEXT_PUBLIC_USE_MOCK=true
```

### 5. Initialize Database (When Ready)
```bash
# Only when you start using real database
npx prisma generate
npx prisma migrate dev
```

### 6. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

## Common Issues & Solutions

### Issue: "Module not found" errors
```bash
# Solution: Dependencies out of sync
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Next.js build errors"
```bash
# Solution: Clear cache
rm -rf .next
npm run dev
```

### Issue: "Git merge conflicts in package-lock.json"
```bash
# Solution: Regenerate lock file
git checkout --theirs package-lock.json
npm install
git add package-lock.json
git commit -m "Resolve package-lock conflict"
```

### Issue: "Database schema out of sync"
```bash
# Solution: Reset local database
rm prisma/*.db
npx prisma migrate dev
```

### Issue: "Port 3000 already in use"
```bash
# Solution: Use different port
PORT=3001 npm run dev
# Or kill the process using port 3000
```

## Best Practices for Multi-Computer Development

### 1. **Always Pull Before Starting**
```bash
git pull --rebase origin master
npm install  # In case dependencies changed
```

### 2. **Commit Frequently**
```bash
# Small, frequent commits are better
git add .
git commit -m "Add expense form validation"
git push
```

### 3. **Use Consistent Node Version**
```bash
# Check .nvmrc file
nvm use  # Automatically uses version from .nvmrc
```

### 4. **Keep Environments Separate**
- Use `.env.local` for local settings
- Never commit real API keys or secrets
- Each computer can have different database connections

### 5. **Handle Conflicts Carefully**
```bash
# If you have conflicts:
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git rebase --continue
```

## VS Code Settings Sync

### Option 1: Use VS Code Settings Sync
1. Sign in to VS Code with GitHub/Microsoft account
2. Turn on Settings Sync
3. Settings will sync automatically

### Option 2: Use Project Settings
```bash
# Create shared VS Code settings
mkdir .vscode
cp .vscode/settings.json.example .vscode/settings.json
```

## Development Workflow Example

### Computer A (Work Laptop):
```bash
# Morning: Start new feature
git pull --rebase
npm install
npm run dev

# Work on feature...

# Evening: Save progress
git add .
git commit -m "WIP: Add receipt upload"
git push
```

### Computer B (Home Desktop):
```bash
# Evening: Continue work
git pull --rebase
npm install
npm run dev

# Continue feature...

# Night: Complete feature
git add .
git commit -m "Complete receipt upload feature"
git push
```

## Sync Checklist

Before switching computers, ensure:
- [ ] All changes committed and pushed
- [ ] No uncommitted files (`git status`)
- [ ] Build is working (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Document any setup changes

## Environment-Specific Settings

### Development (Both Computers):
```env
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Computer A (With Azure Access):
```env
NEXT_PUBLIC_USE_MOCK=false
DATABASE_URL=your-azure-connection
AZURE_STORAGE_CONNECTION_STRING=your-storage
```

### Computer B (Mock Only):
```env
NEXT_PUBLIC_USE_MOCK=true
# No Azure credentials needed
```

## Quick Commands Reference

```bash
# Daily workflow
git pull --rebase        # Get latest code
npm install              # Update dependencies
npm run dev             # Start development

# Before switching computers
git add .               # Stage changes
git commit -m "msg"     # Commit changes
git push               # Push to remote

# Troubleshooting
rm -rf .next           # Clear Next.js cache
rm -rf node_modules    # Clear dependencies
npm install            # Reinstall dependencies
npx prisma generate    # Regenerate Prisma client
```

---

*This setup ensures smooth development across multiple computers while keeping sensitive data and local preferences separate.*