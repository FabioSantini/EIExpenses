# Development Environment Setup for EI-Expenses

## Required Tools & Software

### 1. Core Development Tools

#### **Node.js & Package Manager**
- **Node.js**: v18.x or v20.x LTS (recommended: v20.x)
  - Download: https://nodejs.org/
  - Verify: `node --version`
- **npm**: Comes with Node.js (v9.x or higher)
  - Verify: `npm --version`
- **pnpm** (Optional but recommended for monorepo):
  ```bash
  npm install -g pnpm
  ```

#### **Code Editor**
- **Visual Studio Code** (Recommended)
  - Download: https://code.visualstudio.com/
  - Required Extensions:
    - `ESLint` - Code linting
    - `Prettier - Code formatter` - Code formatting
    - `Tailwind CSS IntelliSense` - Tailwind autocomplete
    - `Prisma` - Prisma schema support
    - `TypeScript and JavaScript Language Features`
    - `Error Lens` - Inline error display
    - `Thunder Client` or `REST Client` - API testing
    - `GitLens` - Git integration
    - `Auto Rename Tag` - HTML/JSX tag renaming
    - `ES7+ React/Redux/React-Native snippets`

### 2. Database Tools (for later Azure SQL integration)

#### **For Development/Testing**
- **SQLite** (for local development without Azure)
  - Automatically handled by Prisma
  - No installation needed

#### **For Azure SQL Development**
- **Azure Data Studio** (Free)
  - Download: https://azure.microsoft.com/en-us/products/data-studio
  - For connecting to Azure SQL Database
- **SQL Server Management Studio (SSMS)** (Optional, Windows only)
  - Download: https://learn.microsoft.com/en-us/sql/ssms/
- **Docker Desktop** (For local SQL Server testing)
  - Download: https://www.docker.com/products/docker-desktop/
  - To run SQL Server locally:
  ```bash
  docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Password" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
  ```

### 3. Azure Development Tools

#### **Azure CLI**
- Download: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
- Verify: `az --version`
- Login: `az login`

#### **Azure Storage Explorer** (for Blob Storage)
- Download: https://azure.microsoft.com/en-us/features/storage-explorer/
- For managing receipt files in Blob Storage

#### **Azure Functions Core Tools** (for serverless functions)
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 4. API Development & Testing

#### **Postman** or **Insomnia**
- Postman: https://www.postman.com/downloads/
- Insomnia: https://insomnia.rest/download
- For testing API endpoints

#### **tRPC DevTools** (Browser Extension)
- Chrome: Search "tRPC DevTools" in Chrome Web Store
- For debugging tRPC calls

### 5. Browser & Mobile Testing

#### **Browsers**
- **Google Chrome** (Primary)
  - DevTools for responsive testing
  - PWA installation testing
- **Microsoft Edge** (Secondary)
- **Firefox Developer Edition** (Optional)
  - Better CSS Grid/Flexbox debugging

#### **Browser Extensions**
- **React Developer Tools** - React component debugging
- **Redux DevTools** (if using Redux/Zustand)
- **Lighthouse** - Performance testing (built into Chrome)
- **WAVE** - Accessibility testing

#### **Mobile Testing**
- **Chrome DevTools Device Mode** - Built-in mobile emulation
- **ngrok** (for testing on real devices):
  ```bash
  npm install -g ngrok
  # Usage: ngrok http 3000
  ```
- **LambdaTest** or **BrowserStack** (Optional) - Cross-browser testing

### 6. Git & Version Control

#### **Git**
- Download: https://git-scm.com/downloads
- Verify: `git --version`

#### **GitHub Desktop** (Optional GUI)
- Download: https://desktop.github.com/

### 7. Development Utilities

#### **Global npm packages**
```bash
# Install all at once
npm install -g typescript ts-node nodemon prisma vercel @azure/static-web-apps-cli

# Verify installations
tsc --version
ts-node --version
nodemon --version
prisma --version
```

### 8. Testing Tools

#### **Playwright** (E2E Testing)
```bash
# Will be installed per project, but you can install globally for quick tests
npm install -g @playwright/test
# Install browsers
npx playwright install
```

### 9. Additional Helpful Tools

#### **Windows Terminal** (Windows)
- Download: Microsoft Store
- Better terminal experience

#### **iTerm2** (macOS)
- Download: https://iterm2.com/
- Better terminal for Mac

#### **Oh My Zsh** (Optional - Better terminal)
- https://ohmyz.sh/

#### **JSON Viewer** (Browser Extension)
- For viewing JSON responses in browser

#### **ColorZilla** (Browser Extension)
- For picking colors from the EI-Benchmark design

## Environment Setup Steps

### 1. Initial Setup
```bash
# Clone the repository
git clone [your-repo-url]
cd EI-Expenses

# Install dependencies
npm install
# or with pnpm
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Environment Variables (.env.local)
```env
# Development Mode
NEXT_PUBLIC_USE_MOCK=true

# Azure (for production - not needed initially)
AZURE_STORAGE_CONNECTION_STRING=
DATABASE_URL=
AZURE_AD_B2C_TENANT_ID=
AZURE_AD_B2C_CLIENT_ID=

# OpenAI (for OCR - can use mock initially)
OPENAI_API_KEY=

# Google Maps (optional for fuel expenses)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. VS Code Settings
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### 4. Recommended VS Code Extensions Config
Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "dsznajder.es7-react-js-snippets",
    "usernamehw.errorlens",
    "eamodio.gitlens",
    "formulahendry.auto-rename-tag",
    "thunderclient.thunder-client"
  ]
}
```

## Quick Start Commands

```bash
# Development server
npm run dev
# Open http://localhost:3000

# Build for production
npm run build

# Run production build locally
npm run start

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Prisma commands (when ready for database)
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run migrations
npx prisma studio  # Open Prisma Studio GUI
```

## Testing Your Setup

### 1. Verify Node.js Installation
```bash
node --version  # Should show v18+ or v20+
npm --version   # Should show v9+
```

### 2. Create a Test Next.js App
```bash
npx create-next-app@latest test-app --typescript --tailwind --app
cd test-app
npm run dev
# Should open at http://localhost:3000
```

### 3. Test Azure CLI (if using Azure)
```bash
az --version
az login
az account list
```

## Troubleshooting Common Issues

### Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### npm Install Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors in VS Code
- Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Ensure using workspace TypeScript version

## Development Workflow

### Daily Development
1. Start the dev server: `npm run dev`
2. Open browser at `http://localhost:3000`
3. Open VS Code with the project
4. Browser DevTools open for debugging

### Before Committing
1. Run type check: `npm run type-check`
2. Run linter: `npm run lint`
3. Run tests: `npm run test`
4. Format code: `npm run format`

### Testing on Mobile
1. Run: `npm run dev`
2. Run: `ngrok http 3000`
3. Use ngrok URL on mobile device
4. Ensure devices are on same network

## Minimum vs Recommended Setup

### Minimum (To Start Immediately)
- ✅ Node.js v18+
- ✅ Visual Studio Code
- ✅ Git
- ✅ Chrome Browser

### Recommended (For Full Development)
- ✅ Everything in Minimum
- ✅ Azure CLI
- ✅ Docker Desktop
- ✅ Postman/Insomnia
- ✅ Azure Data Studio
- ✅ All VS Code extensions
- ✅ ngrok for mobile testing

## Notes for Windows Users

- Use PowerShell or Windows Terminal (not Command Prompt)
- Run VS Code as Administrator if permission issues occur
- Enable WSL2 for better development experience (optional)
- Some commands may need GitBash instead of PowerShell

## Notes for Mac Users

- Install Xcode Command Line Tools: `xcode-select --install`
- Use Homebrew for package management: https://brew.sh/
- Install Node via Homebrew: `brew install node`

---

*With this setup, you'll be ready to develop, debug, and test the EI-Expenses application locally!*