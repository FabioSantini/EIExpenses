# EI-Expenses Project Requirements & Architecture

## Project Overview
Mobile web application for expense management running on Azure, designed for company expense tracking with AI-powered receipt processing.

## Core Requirements

### User Management
- Basic user management initially
- Phase 2: Integration with Azure Entra ID
- Expected concurrent users: Maximum 50

### Expense Entity Structure
```typescript
interface Expense {
  date: Date;
  expenseType: ExpenseType;
  description: string;
  currency: string;
  amount: number;
  receiptUrl?: string;
  metadata?: ExpenseMetadata;
}

enum ExpenseType {
  PARKING = "Parking",
  FUEL = "Fuel",
  TELEPASS = "Telepass",
  LUNCH = "Lunch",
  DINNER = "Dinner",
  HOTEL = "Hotel",
  TRAIN = "Train",
  BREAKFAST = "Breakfast",
  TOURIST_TAX = "Tourist Tax",
  OTHER = "Other"
}
```

### Expense-Specific Features

#### Fuel Expenses
- Interface for kilometer estimation
- Start location and end location with Google Maps integration
- Address autocomplete with modern UX (suggestions while typing)
- Automatic distance calculation via Google Maps API

#### Meal Expenses (Lunch, Dinner, Breakfast)
- Customer name field with saved customer list
- Colleague names field with saved colleague list
- Auto-generate description from customer + colleague combination
- Quick entry from previously used combinations

### Receipt Processing
1. Photo capture capability
2. AI-powered analysis to extract:
   - Expense type (automatic categorization)
   - Date
   - Amount
3. Digital storage of receipts attached to expenses
4. Download capability for stored receipts

### Reporting
- Excel report generation for expense tracking
- Simple formatting requirements
- No offline requirements

## Technology Stack Decision

### Frontend: Next.js 14 with TypeScript
- **Framework**: Next.js 14 with App Router
- **UI Components**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **PWA**: Progressive Web App capabilities for mobile experience
- **Maps**: Google Places API for address autocomplete

### Backend: Node.js with TypeScript
- **API Framework**: Fastify or Hono (lightweight, high performance)
- **ORM**: Prisma with Azure SQL Database
- **API Contract**: tRPC for type-safe frontend-backend communication
- **Serverless**: Azure Functions for OCR processing

### Azure Infrastructure
```yaml
Core Services:
  - Azure App Service: Host Next.js application
  - Azure SQL Database: Relational data storage
  - Azure Blob Storage: Receipt image storage
  - Azure Functions: Serverless processing

Authentication:
  - Azure AD B2C: Phase 1 basic authentication
  - Azure Entra ID: Phase 2 enterprise integration
```

### AI Integration
- **OpenAI GPT-4 Vision API**: Receipt OCR and analysis
- **Structured Output**: JSON extraction from receipts
- **Intelligent Categorization**: Automatic expense type detection

### External APIs
- **Google Maps API**: Address autocomplete and distance calculation
- **OpenAI API**: GPT-4 Vision for receipt processing

## System Architecture

```
┌────────────────────────────────────┐
│     Next.js 14 (Mobile PWA)        │
│  • Server Components                │
│  • Responsive Design                │
│  • Camera Integration               │
│  • Google Places Autocomplete       │
└──────────────┬─────────────────────┘
               │ tRPC (type-safe)
┌──────────────▼─────────────────────┐
│      API Routes (Next.js)          │
│  • Business Logic                  │
│  • Validation                      │
│  • Excel Generation                │
└──────────────┬─────────────────────┘
               │
    ┌──────────┴────────┬─────────────┬──────────┐
    │                   │             │          │
┌───▼───┐  ┌───────────▼──┐  ┌───────▼──┐  ┌────▼────┐
│Azure  │  │Azure Blob    │  │OpenAI    │  │Google   │
│SQL    │  │Storage       │  │GPT-4V    │  │Maps API │
│       │  │(Receipts)    │  │(OCR/AI)  │  │(Routes) │
└───────┘  └──────────────┘  └──────────┘  └─────────┘
```

## Implementation Phases

### Phase 1: MVP (4 weeks)
- [x] Technology stack selection
- [ ] Database schema design
- [ ] Basic authentication with Azure AD B2C
- [ ] Core expense CRUD operations
- [ ] Simple receipt photo upload (storage only)
- [ ] Manual expense data entry
- [ ] Basic Excel export functionality

### Phase 2: AI Enhancement (2 weeks)
- [ ] GPT-4 Vision integration for receipt OCR
- [ ] Automatic expense categorization
- [ ] Google Maps integration for fuel expenses
- [ ] Address autocomplete implementation
- [ ] Customer/colleague quick lists

### Phase 3: Polish & Enterprise (2 weeks)
- [ ] Advanced customer/colleague management
- [ ] Expense templates for recurring expenses
- [ ] Advanced reporting with filters
- [ ] Azure Entra ID integration preparation
- [ ] Performance optimization
- [ ] User experience refinements

## Key Implementation Details

### Receipt Processing Flow
```typescript
// GPT-4 Vision API integration
async function processReceipt(imageUrl: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract expense type, date, amount, and vendor from this receipt. Return as JSON."
        },
        {
          type: "image_url",
          image_url: { url: imageUrl }
        }
      ]
    }],
    response_format: { type: "json_object" }
  });
  
  return parseExpenseData(response);
}
```

### Dynamic Expense Forms
```typescript
// Component selection based on expense type
const ExpenseForm = ({ type }: { type: ExpenseType }) => {
  switch(type) {
    case 'FUEL':
      return <FuelExpenseForm />; // With maps integration
    case 'LUNCH':
    case 'DINNER':
    case 'BREAKFAST':
      return <MealExpenseForm />; // Customer/colleague selection
    default:
      return <StandardExpenseForm />;
  }
};
```

### Database Schema (Prisma)
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  expenses  Expense[]
  createdAt DateTime  @default(now())
}

model Expense {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  date        DateTime
  type        ExpenseType
  description String
  currency    String      @default("EUR")
  amount      Decimal     @db.Decimal(10, 2)
  receiptUrl  String?
  metadata    Json?       // For type-specific data
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  company   String?
  createdAt DateTime @default(now())
}

model Colleague {
  id        String   @id @default(cuid())
  name      String
  email     String?
  createdAt DateTime @default(now())
}
```

## Development Environment Setup

### Prerequisites
- Node.js 18+ 
- Azure subscription
- OpenAI API key
- Google Cloud account (for Maps API)

### Environment Variables
```env
# Database
DATABASE_URL="azure-sql-connection-string"

# Azure
AZURE_STORAGE_CONNECTION_STRING=""
AZURE_AD_B2C_TENANT_ID=""
AZURE_AD_B2C_CLIENT_ID=""

# OpenAI
OPENAI_API_KEY=""

# Google
GOOGLE_MAPS_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="https://your-app.azurewebsites.net"
```

## Deployment Strategy
- **Full Azure deployment** (chosen over Vercel hybrid)
- Azure DevOps or GitHub Actions for CI/CD
- Staging and production environments
- Automated testing before deployment

## Security Considerations
- Receipt images stored in private Azure Blob containers
- Row-level security for multi-tenant scenarios
- API rate limiting for OpenAI calls
- Secure handling of sensitive expense data
- GDPR compliance for European operations

## Performance Optimizations
- Server-side rendering for initial page load
- Image optimization for receipt photos
- Lazy loading for expense lists
- Caching strategy for frequently accessed data
- Batch processing for Excel generation

## Next Steps
1. Set up Azure resources
2. Initialize Next.js project with TypeScript
3. Configure Prisma with Azure SQL
4. Implement basic authentication
5. Create core expense CRUD operations
6. Add receipt upload functionality
7. Integrate OpenAI for receipt processing
8. Implement Google Maps integration
9. Add Excel export functionality
10. Deploy MVP to Azure

## Questions to Address
- [ ] Specific Excel report format/template needed?
- [ ] Multi-currency conversion requirements?
- [ ] Approval workflow needed for expenses?
- [ ] Budget limits or alerts required?
- [ ] Mobile app needed in future (React Native/Flutter)?
- [ ] Backup and disaster recovery requirements?

---
*Last Updated: 2025-09-12*
*Project Status: Requirements Gathering & Architecture Design Phase*