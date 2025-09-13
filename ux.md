# EI-Expenses UX Design System

Based on EI-Benchmark corporate design standards

## 1. Color Palette

### Primary Colors
```css
--color-primary: #00BCD4;        /* Teal/Turquoise - Primary actions, active states */
--color-primary-hover: #00ACC1;  /* Darker teal for hover states */
--color-primary-light: #E0F7FA;  /* Light teal for backgrounds */

--color-background: #FFFFFF;     /* White - Main background */
--color-surface: #FAFAFA;        /* Light gray - Card backgrounds */
--color-border: #E0E0E0;         /* Light gray - Borders */
```

### Semantic Colors
```css
--color-success: #4CAF50;        /* Green - Complete, saved */
--color-warning: #FF9800;        /* Orange - Pending, draft */
--color-error: #F44336;          /* Red - Failed, error */
--color-info: #2196F3;           /* Blue - Information */
```

### Text Colors
```css
--color-text-primary: #212121;   /* Dark gray - Primary text */
--color-text-secondary: #757575; /* Medium gray - Secondary text */
--color-text-disabled: #BDBDBD;  /* Light gray - Disabled text */
--color-text-inverse: #FFFFFF;   /* White - Text on dark backgrounds */
```

### Expense Type Colors (Company Standard)
```css
--expense-parking: #2196F3;      /* Blue */
--expense-fuel: #F44336;         /* Red */
--expense-telepass: #4CAF50;     /* Green */
--expense-lunch: #FF9800;        /* Orange */
--expense-dinner: #9C27B0;       /* Purple */
--expense-hotel: #00BCD4;        /* Teal */
--expense-train: #8BC34A;        /* Light Green */
--expense-breakfast: #FFC107;    /* Amber */
--expense-tourist-tax: #E91E63;  /* Pink */
--expense-other: #607D8B;        /* Blue Gray */
```

## 2. Typography

### Font Family
```css
--font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
--font-mono: "SF Mono", Monaco, "Courier New", monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - Labels, captions */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Subheadings */
--text-xl: 1.25rem;    /* 20px - Section titles */
--text-2xl: 1.5rem;    /* 24px - Page titles */
--text-3xl: 2rem;      /* 32px - Large displays */
--text-4xl: 2.5rem;    /* 40px - Hero numbers */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## 3. Spacing System

8px base grid system
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

## 4. Component Patterns

### Cards
- White background (#FFFFFF)
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.12)`
- Border radius: 8px
- Padding: 24px
- Border: 1px solid #E0E0E0 (optional)

### Quick Access Cards (Dashboard Style)
```tsx
<Card className="p-6 hover:shadow-md transition-shadow">
  <div className="flex items-center justify-between mb-3">
    <Icon className="h-8 w-8 text-primary" />
    <Badge status="active" />
  </div>
  <div className="text-4xl font-bold mb-2">13</div>
  <div className="text-sm text-gray-500">Total Expenses</div>
  <div className="mt-3 pt-3 border-t">
    <div className="flex justify-between text-xs">
      <span className="text-success">✓ Complete: 5</span>
      <span className="text-warning">⚬ Draft: 1</span>
    </div>
  </div>
</Card>
```

### Status Indicators
```tsx
// Status badge with colored dot
<div className="flex items-center gap-2">
  <span className="w-2 h-2 rounded-full bg-success" />
  <span className="text-sm">Active</span>
</div>
```

### Data Tables
- Clean borders with #E0E0E0
- Alternating row backgrounds (optional)
- Clear header typography (uppercase, smaller font)
- Action buttons aligned right
- Eye icon for view actions

### Navigation (Mobile Adapted)
```tsx
// Bottom navigation for mobile (adapted from sidebar)
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
  <div className="grid grid-cols-5 h-16">
    <NavItem icon={Home} label="Home" active />
    <NavItem icon={Receipt} label="Expenses" />
    <NavItem icon={Camera} label="Scan" primary />
    <NavItem icon={FileText} label="Reports" />
    <NavItem icon={User} label="Profile" />
  </div>
</nav>
```

## 5. Layout Structure

### Mobile Layout
```
┌─────────────────────────┐
│      Header Bar         │
│  Hello, [User Name]     │
├─────────────────────────┤
│                         │
│     Quick Access        │
│   ┌──────┬──────┐      │
│   │ Card │ Card │      │
│   └──────┴──────┘      │
│   ┌──────┬──────┐      │
│   │ Card │ Card │      │
│   └──────┴──────┘      │
│                         │
│    Recent Activity      │
│   ┌─────────────┐      │
│   │  List Item  │      │
│   ├─────────────┤      │
│   │  List Item  │      │
│   └─────────────┘      │
│                         │
├─────────────────────────┤
│    Bottom Navigation    │
└─────────────────────────┘
```

### Desktop/Tablet Layout
```
┌────┬────────────────────────┐
│    │       Header Bar        │
│ S  │   Hello, [User Name]    │
│ i  ├────────────────────────┤
│ d  │                         │
│ e  │     Quick Access        │
│ b  │  ┌────┬────┬────┬────┐ │
│ a  │  │Card│Card│Card│Card│ │
│ r  │  └────┴────┴────┴────┘ │
│    │                         │
│    │    Recent Activity      │
│    │  ┌──────────────────┐  │
│    │  │   Data Table     │  │
│    │  └──────────────────┘  │
└────┴────────────────────────┘
```

## 6. Icons System

### Navigation Icons (Colored)
- 🏠 Home - Teal (#00BCD4)
- 📄 Expenses - Blue (#2196F3)
- 📸 Camera/Scan - Orange (#FF9800)
- 📊 Reports - Purple (#9C27B0)
- 👤 Profile - Gray (#607D8B)

### Expense Type Icons
- 🅿️ Parking - Blue (#2196F3)
- ⛽ Fuel - Red (#F44336)
- 🛣️ Telepass - Green (#4CAF50)
- 🍽️ Lunch - Orange (#FF9800)
- 🍷 Dinner - Purple (#9C27B0)
- 🏨 Hotel - Teal (#00BCD4)
- 🚂 Train - Light Green (#8BC34A)
- ☕ Breakfast - Amber (#FFC107)
- 🏛️ Tourist Tax - Pink (#E91E63)
- 📌 Other - Blue Gray (#607D8B)

## 7. Form Components

### Input Fields
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Field Label
  </label>
  <input 
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-primary 
               focus:border-transparent"
  />
  <p className="text-xs text-gray-500">Helper text</p>
</div>
```

### Select Dropdowns
```tsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-primary">
  <option>Select an option</option>
</select>
```

### Buttons
```tsx
// Primary Button
<button className="px-4 py-2 bg-primary text-white rounded-md 
                   hover:bg-primary-hover transition-colors">
  Primary Action
</button>

// Secondary Button
<button className="px-4 py-2 border border-gray-300 text-gray-700 
                   rounded-md hover:bg-gray-50 transition-colors">
  Secondary Action
</button>

// Icon Button
<button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
  <Icon className="h-5 w-5 text-primary" />
</button>
```

## 8. Mobile-Specific Components

### Floating Action Button (FAB)
```tsx
<button className="fixed bottom-20 right-4 w-14 h-14 bg-primary 
                   text-white rounded-full shadow-lg hover:shadow-xl 
                   transition-all flex items-center justify-center">
  <Plus className="h-6 w-6" />
</button>
```

### Pull-to-Refresh Indicator
```tsx
<div className="flex justify-center py-4">
  <div className="animate-spin rounded-full h-8 w-8 
                  border-b-2 border-primary" />
</div>
```

### Toast Notifications
```tsx
<div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg 
                border-l-4 border-success p-4">
  <div className="flex items-center">
    <CheckCircle className="h-5 w-5 text-success mr-2" />
    <span className="text-sm">Expense saved successfully</span>
  </div>
</div>
```

## 9. Responsive Breakpoints

```css
--mobile: 0px;       /* Default mobile-first */
--tablet: 768px;     /* md: tablets */
--desktop: 1024px;   /* lg: small desktops */
--wide: 1280px;      /* xl: large desktops */
```

## 10. Animation & Transitions

```css
--transition-fast: 150ms ease-in-out;
--transition-base: 200ms ease-in-out;
--transition-slow: 300ms ease-in-out;

--animation-spin: spin 1s linear infinite;
--animation-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
--animation-bounce: bounce 1s infinite;
```

## 11. Shadows & Elevation

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 1px 3px rgba(0,0,0,0.12);
--shadow-lg: 0 4px 6px rgba(0,0,0,0.1);
--shadow-xl: 0 10px 25px rgba(0,0,0,0.12);
```

## 12. Implementation Notes

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00BCD4',
          hover: '#00ACC1',
          light: '#E0F7FA',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'sans-serif'],
      },
    },
  },
}
```

### Key Design Principles
1. **Clean & Minimal**: White backgrounds, subtle borders, plenty of whitespace
2. **Color Coding**: Each expense type has consistent color throughout the app
3. **Data Focus**: Large numbers for key metrics, clear data hierarchy
4. **Mobile First**: Touch-friendly targets (44px minimum), bottom navigation
5. **Corporate Consistency**: Matches EI-Benchmark design language exactly

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Minimum contrast ratio 4.5:1 for normal text
- Touch targets minimum 44x44px
- Focus indicators on all interactive elements
- Screen reader support with proper ARIA labels

---
*Based on EI-Benchmark corporate design system*
*Last Updated: 2025-01-13*