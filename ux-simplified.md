# EI-Expenses Simplified UX Flow

## Simplified App Concept
The app is a **receipt collector and expense line builder** that outputs Excel files for approval workflow (handled externally).

## Core User Flow

```
1. Home Screen
   └── Active Expense Report (e.g., "January 2025")
       ├── Add Expense Line (+)
       │   ├── Scan Receipt (Camera)
       │   └── Manual Entry
       ├── View/Edit Expense Lines
       └── Export to Excel

2. Add Expense Flow
   └── Choose Method
       ├── 📸 Scan Receipt
       │   └── Camera → OCR → Review/Edit → Save
       └── ✏️ Manual Entry
           └── Form → Save
```

## Simplified Screen Structure

### 1. Home Screen
```
┌─────────────────────────┐
│    January 2025         │
│    12 expenses • €450   │
├─────────────────────────┤
│  Recent Expense Lines   │
│  ┌───────────────────┐  │
│  │ 🅿️ Parking - €15  │  │
│  │ Jan 10 - Milano   │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ 🍽️ Lunch - €35    │  │
│  │ Jan 9 - Customer X│  │
│  └───────────────────┘  │
│                         │
│  [+ Add Expense]        │
│  [📥 Export Excel]      │
└─────────────────────────┘
```

### 2. Add Expense Screen
```
┌─────────────────────────┐
│    Add Expense          │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │   📸               │  │
│  │  Scan Receipt     │  │
│  │  Quick OCR scan   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   ✏️               │  │
│  │  Manual Entry     │  │
│  │  Type details     │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

### 3. Expense Form (After OCR or Manual)
```
┌─────────────────────────┐
│    Expense Details      │
├─────────────────────────┤
│ Date:    [10/01/2025]   │
│ Type:    [🍽️ Lunch  ▼]  │
│ Amount:  [35.00] EUR    │
│ Description:            │
│ [Business lunch      ]  │
│                         │
│ // Dynamic fields based │
│ // on expense type:     │
│                         │
│ Customer:               │
│ [Company XYZ        ▼]  │
│ (shows suggestions)     │
│                         │
│ Colleagues:             │
│ [John Doe, Jane S...▼]  │
│ (shows suggestions)     │
│                         │
│ Receipt: [📎 IMG_123]   │
│                         │
│ [Cancel]    [💾 Save]   │
└─────────────────────────┘
```

### 4. Dynamic Fields by Type

#### Fuel Expense
- Start Location (with autocomplete)
- End Location (with autocomplete)
- Kilometers (auto-calculated or manual)

#### Meal Expenses (Lunch/Dinner/Breakfast)
- Customer Name (text with suggestions from history)
- Colleague Names (text with suggestions from history)

#### Hotel
- Number of Nights
- Location

#### Others
- Just basic fields (date, amount, description)

## Simplified Components

### Navigation
- **No complex navigation needed**
- Simple back button and actions
- Home → Add/Edit → Save flow

### Key UI Elements

1. **Expense Type Selector**
   - Simple dropdown with colored icons
   - Icons match company colors from EI-Benchmark

2. **Smart Text Fields**
   - Show previous entries as user types
   - No complex management screens
   - Auto-save new entries for future suggestions

3. **Receipt Handler**
   - Simple camera capture
   - Display thumbnail after capture
   - Tap to view full size

4. **Excel Export**
   - Single button action
   - Downloads Excel file with all expense lines
   - Formatted for company approval process

## Technical Simplifications

### Data Flow
```
User Input → ExpenseLine → ExpenseReport → Excel Export
     ↑                           ↓
   OCR Scanner          Suggestion History
```

### State Management
- Current expense report (month/year)
- List of expense lines
- Temporary form data
- Suggestion cache (customers/colleagues)

### No Need For
- ❌ Approval workflows
- ❌ User roles/permissions
- ❌ Complex status tracking
- ❌ Notifications
- ❌ Budget tracking
- ❌ Analytics/charts
- ❌ Multi-currency conversion
- ❌ Expense categories beyond types

## Mobile-First Priorities

1. **Fast Expense Entry**
   - Camera ready in 2 taps
   - OCR processes quickly
   - Smart defaults (today's date, EUR)

2. **Efficient Data Entry**
   - Large touch targets
   - Autocomplete suggestions
   - Minimal required fields

3. **Quick Export**
   - One-tap Excel generation
   - Email/share directly from device

## Excel Output Format

```
| Date       | Type    | Description      | Amount | Currency | Customer    | Colleagues  | Receipt |
|------------|---------|------------------|--------|----------|-------------|-------------|---------|
| 2025-01-10 | Parking | Airport parking  | 15.00  | EUR      |             |             | Yes     |
| 2025-01-09 | Lunch   | Business lunch   | 35.00  | EUR      | Company XYZ | John, Jane  | Yes     |
| 2025-01-08 | Fuel    | Milano-Torino    | 45.00  | EUR      |             |             | Yes     |
```

## Implementation Priority

### Phase 1 - Core (Week 1)
1. Basic expense report creation
2. Manual expense line entry
3. Simple Excel export

### Phase 2 - OCR (Week 2)
1. Camera integration
2. GPT-4 Vision OCR
3. Auto-population of fields

### Phase 3 - Enhancements (Week 3)
1. Autocomplete suggestions
2. Google Maps for fuel expenses
3. Receipt image storage
4. Improved Excel formatting

---
*Simplified design focused on: Collect → Process → Export*