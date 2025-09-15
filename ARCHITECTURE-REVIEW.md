# Revisione Architettura EI-Expenses

## 🔍 **Analisi Architettura Attuale**

### **Struttura Dati Esistente**
```typescript
// BUONO: Schema Zod ben strutturato
ExpenseLineSchema = {
  id: string (cuid),
  reportId: string (cuid),
  date: Date,
  type: ExpenseType enum,
  amount: number,
  metadata: string (JSON raw) // ❌ PROBLEMA
}

// BUONO: Interface IDataService chiara
interface IDataService {
  getExpenseReports(): Promise<ExpenseReport[]>
  addExpenseLine(reportId, line): Promise<ExpenseLine>
  uploadReceipt(file): Promise<string>
  processReceiptOCR(url): Promise<OCRResult>
}
```

### **Problemi Identificati**
1. **Date Serialization**: localStorage corrompe Date objects
2. **File Storage**: URL.createObjectURL() non persiste
3. **Metadata Typing**: String invece di tipizzato per expense type
4. **Interface Duplication**: Due definizioni IDataService
5. **Storage Limits**: localStorage inadeguato per file

## 🏗️ **Architettura Migliorata**

### **1. Enhanced Data Schema**
```typescript
// ✅ MIGLIORATO: Metadata tipizzati per expense type
interface FuelExpenseMetadata {
  startLocation: string;
  endLocation: string;
  distance?: number;
  route?: string;
}

interface MealExpenseMetadata {
  customer?: string;
  colleagues?: string[];
  attendees?: number;
}

interface HotelExpenseMetadata {
  location: string;
  nights: number;
  room?: string;
  bookingRef?: string;
}

// Union type per metadata
type ExpenseMetadata =
  | { type: 'FUEL'; data: FuelExpenseMetadata }
  | { type: 'LUNCH' | 'DINNER' | 'BREAKFAST'; data: MealExpenseMetadata }
  | { type: 'HOTEL'; data: HotelExpenseMetadata }
  | { type: 'PARKING' | 'TRAIN' | 'OTHER'; data: Record<string, any> };

// ✅ MIGLIORATO: ExpenseLine con metadata tipizzati
interface ExpenseLine {
  id: string;
  reportId: string;
  date: string; // ISO string per localStorage compatibility
  type: ExpenseType;
  description: string;
  amount: number;
  currency: string;
  receiptId?: string; // Invece di URL
  ocrProcessed: boolean;
  ocrData?: OCRResult;
  metadata?: ExpenseMetadata;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

### **2. Storage Adapter Pattern**
```typescript
// ✅ NUOVO: Adapter pattern per storage flessibile
interface IStorageAdapter {
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageAdapter implements IStorageAdapter {
  async save<T>(key: string, data: T): Promise<void> {
    // Serializza Date correttamente
    const serialized = JSON.stringify(data, (key, value) => {
      if (value instanceof Date) return { __type: 'Date', value: value.toISOString() };
      return value;
    });
    localStorage.setItem(key, serialized);
  }

  async load<T>(key: string): Promise<T | null> {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    // Deserializza Date correttamente
    return JSON.parse(stored, (key, value) => {
      if (value && value.__type === 'Date') return new Date(value.value);
      return value;
    });
  }
}

class IndexedDBAdapter implements IStorageAdapter {
  // Implementazione per storage più robusto
}
```

### **3. File Storage Strategy**
```typescript
// ✅ NUOVO: File storage con persistenza
interface IFileStorage {
  store(file: File): Promise<string>; // Returns fileId
  retrieve(fileId: string): Promise<File | null>;
  remove(fileId: string): Promise<void>;
  getUrl(fileId: string): Promise<string>; // Blob URL temporaneo
}

class IndexedDBFileStorage implements IFileStorage {
  private dbName = 'ei-expenses-files';

  async store(file: File): Promise<string> {
    const fileId = crypto.randomUUID();
    const buffer = await file.arrayBuffer();

    // Store in IndexedDB per persistenza cross-session
    await this.saveToIndexedDB(fileId, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer,
      createdAt: new Date().toISOString()
    });

    return fileId;
  }

  async getUrl(fileId: string): Promise<string> {
    const fileData = await this.loadFromIndexedDB(fileId);
    if (!fileData) throw new Error('File not found');

    const blob = new Blob([fileData.buffer], { type: fileData.type });
    return URL.createObjectURL(blob);
  }
}

class AzureBlobFileStorage implements IFileStorage {
  // Implementazione per Azure Blob Storage
}
```

### **4. Enhanced DataService Architecture**
```typescript
// ✅ MIGLIORATO: DataService con dependency injection
interface DataServiceConfig {
  storageAdapter: IStorageAdapter;
  fileStorage: IFileStorage;
  ocrProcessor: IOCRProcessor;
  mapsService: IMapsService;
}

class EnhancedDataService implements IDataService {
  constructor(private config: DataServiceConfig) {}

  async addExpenseLine(reportId: string, line: CreateExpenseLineInput): Promise<ExpenseLine> {
    // Validazione con Zod
    const validatedLine = ExpenseLineCreateSchema.parse(line);

    // Processa metadata specifici per tipo
    const metadata = await this.processMetadata(validatedLine.type, line.metadata);

    // Salva con adapter
    const newLine: ExpenseLine = {
      id: generateId(),
      reportId,
      ...validatedLine,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.config.storageAdapter.save(`expense:${newLine.id}`, newLine);
    return newLine;
  }

  private async processMetadata(type: ExpenseType, rawMetadata: any): Promise<ExpenseMetadata | undefined> {
    switch (type) {
      case 'FUEL':
        if (rawMetadata.startLocation && rawMetadata.endLocation) {
          // Calcola distanza con Google Maps
          const distance = await this.config.mapsService.calculateDistance(
            rawMetadata.startLocation,
            rawMetadata.endLocation
          );
          return { type: 'FUEL', data: { ...rawMetadata, distance } };
        }
        break;
      case 'LUNCH':
      case 'DINNER':
      case 'BREAKFAST':
        return { type, data: rawMetadata };
    }
    return undefined;
  }
}
```

### **5. Factory Pattern per Environment Switching**
```typescript
// ✅ NUOVO: Factory per switching seamless
class DataServiceFactory {
  static create(environment: 'local' | 'azure'): IDataService {
    if (environment === 'azure') {
      return new EnhancedDataService({
        storageAdapter: new AzureSQLAdapter(),
        fileStorage: new AzureBlobFileStorage(),
        ocrProcessor: new OpenAIOCRProcessor(),
        mapsService: new GoogleMapsService()
      });
    }

    return new EnhancedDataService({
      storageAdapter: new IndexedDBAdapter(),
      fileStorage: new IndexedDBFileStorage(),
      ocrProcessor: new MockOCRProcessor(),
      mapsService: new MockMapsService()
    });
  }
}
```

## 🔄 **Piano di Migrazione**

### **Phase A.1: Foundation (2-3 giorni)**
1. **Consolidare Interface**: Unificare IDataService
2. **Enhanced Schemas**: Metadata tipizzati per expense types
3. **Storage Adapters**: LocalStorage + IndexedDB implementations
4. **File Storage**: IndexedDB per persistenza receipt

### **Phase A.2: Enhanced CRUD (3-4 giorni)**
5. **Enhanced DataService**: Con dependency injection
6. **Metadata Processing**: Logic specifico per ogni expense type
7. **Google Maps Mock**: Per fuel expenses
8. **Customer/Colleague**: Suggestion system

### **Phase B: AI Integration (5-7 giorni)**
9. **OCR Processor**: Command pattern con Mock/OpenAI
10. **Smart Categorization**: Auto-detect expense type
11. **Receipt Processing**: Pipeline completo

### **Phase C: Azure Migration (3-5 giorni)**
12. **Azure Adapters**: SQL + Blob implementations
13. **Migration Utils**: Da local ad Azure
14. **Environment Config**: Switching seamless

## 🎯 **Vantaggi Architettura Migliorata**

### **Immediate Benefits**
- ✅ **Date handling corretto** (no più serialization bugs)
- ✅ **File persistence** cross-session con IndexedDB
- ✅ **Type safety** per metadata specifici
- ✅ **Storage scalability** (da 5MB localStorage a 250MB+ IndexedDB)

### **Future Benefits**
- ✅ **Azure migration seamless** via Factory pattern
- ✅ **Testing semplificato** con dependency injection
- ✅ **Performance optimization** con background processing
- ✅ **Multi-tenant ready** per future business growth

## 🚀 **Raccomandazione**

**APPROVA** l'implementazione dell'architettura migliorata.

**Investimento**: +2-3 giorni iniziali
**ROI**: -2 settimane nelle fasi successive + architettura scalabile

L'architettura proposta risolve tutti i problemi identificati e crea una base solida per le fasi successive.

## 🤝 **Next Steps**

1. **Approvazione** architettura da parte del team
2. **Implementazione Phase A.1** (foundation)
3. **Testing** con data migration esistente
4. **Rollout** graduale con feature flags

---
**Architect**: Senior System Designer
**Review Date**: 14/09/2025
**Status**: Pending Approval