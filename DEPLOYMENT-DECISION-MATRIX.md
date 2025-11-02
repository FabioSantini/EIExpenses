# Deployment Decision Matrix - EI-Expenses

Quick reference guide to decide which deployment method to use.

## 🚀 Quick Decision Tree

```
Cosa hai modificato?
│
├─ Solo codice (.ts, .tsx, .css, componenti, logica)?
│  └─ ✅ DEPLOY CODICE (Metodo 3) - 2-3 minuti
│
├─ Dipendenze (package.json)?
│  └─ 🔄 REBUILD CONTAINER (Metodo 1) - 10-15 minuti
│
├─ Dockerfile, Prisma schema, configurazione build?
│  └─ 🔄 REBUILD CONTAINER (Metodo 1) - 10-15 minuti
│
└─ Environment variables, configurazione Azure?
   └─ ⚙️ AGGIORNA CONFIGURAZIONE - 1 minuto
```

---

## 📊 Matrice Completa

| Tipo di Modifica | Deploy Codice | Rebuild Container | Note |
|------------------|---------------|-------------------|------|
| **Codice TypeScript/React** | ✅ SI | ❌ No | Pages, components, hooks, utils |
| **CSS/Tailwind** | ✅ SI | ❌ No | Styling, design changes |
| **API Routes** | ✅ SI | ❌ No | Modifiche logica API |
| **Bugfix generici** | ✅ SI | ❌ No | Correzioni codice |
| **Nuove pagine/feature** | ✅ SI | ❌ No | Se non richiedono nuove dipendenze |
| **Aggiunta librerie** | ❌ No | ✅ SI | package.json modificato |
| **Update dipendenze** | ❌ No | ✅ SI | npm update, security patches |
| **Prisma schema changes** | ❌ No | ✅ SI | Richiede rigenerazione client |
| **Dockerfile changes** | ❌ No | ✅ SI | Build process modificato |
| **next.config.js** | ⚠️ Dipende | ⚠️ Dipende | Se build-time: Container, se runtime: Codice |
| **Environment variables** | ❌ No | ❌ No | Solo config Azure (az webapp config) |
| **Static assets** | ✅ SI | ❌ No | Images, fonts in /public |

---

## 🎯 Metodi di Deployment

### Metodo 3: Deploy Solo Codice (VELOCE) ⚡
**Quando**: 90% dei casi - modifiche a codice esistente
**Tempo**: 2-3 minuti
**Script**: `./deploy-code.sh`

```bash
# Cosa fa:
1. Build Next.js localmente
2. Crea ZIP con .next/standalone + static
3. Upload diretto su Azure
4. Restart automatico
```

**Vantaggi**:
- ⚡ Velocissimo (2-3 minuti totali)
- 💾 Non ricostruisce l'intero container
- 🔄 Deploy incrementale
- 🐛 Perfetto per bugfix rapidi

**Limitazioni**:
- ❌ Non aggiorna dipendenze
- ❌ Non modifica Dockerfile
- ❌ Non aggiorna Prisma Client
- ❌ Usa le dipendenze già installate nel container

---

### Metodo 1: Rebuild Container Completo (SICURO) 🔄
**Quando**: Modifiche a dipendenze, schema, Dockerfile
**Tempo**: 10-15 minuti
**Script**: `./deploy-full.sh`

```bash
# Cosa fa:
1. Build Docker image completo
2. Push su Azure Container Registry
3. Update App Service
4. Pull nuova immagine e restart
```

**Vantaggi**:
- ✅ Tutto aggiornato (dipendenze, Prisma, ecc.)
- ✅ Più sicuro per modifiche strutturali
- ✅ Versioning con tag Docker

**Limitazioni**:
- 🕐 Più lento (10-15 minuti)
- 🐋 Usa più banda (2+ GB)

---

### Metodo 2: CI/CD Automatico (FUTURO) 🤖
**Quando**: Setup una volta, poi automatico
**Tempo**: 5-8 minuti (automatico dopo git push)

Setup da fare solo una volta, poi:
```bash
git add .
git commit -m "Fix: bug xyz"
git push origin main
# ↑ Questo triggera automaticamente build + deploy
```

---

## 📝 Tracking Modifiche

### Registro Deployment

| Data | Tipo Modifica | Metodo Usato | Tempo | Note |
|------|---------------|--------------|-------|------|
| 2025-11-02 | Setup iniziale + fix config | Container Full | 15 min | Prima volta |
| _future_ | Aggiunta expense type | Deploy Codice | 2-3 min | Solo logica |
| _future_ | Update OpenAI API logic | Deploy Codice | 2-3 min | Modifica API route |
| _future_ | Aggiunta libreria UI | Container Full | 12 min | Nuova dipendenza |

---

## 🔍 Esempi Pratici

### ✅ Deploy Codice - Esempi
```typescript
// 1. Fix bug in expense form
// File: src/components/ExpenseForm.tsx
const handleSubmit = async (data: ExpenseFormData) => {
  // FIX: Aggiunta validazione
  if (!data.amount || data.amount <= 0) {
    return toast.error("Amount must be positive");
  }
  // ... resto codice
}
→ DEPLOY CODICE ✅

// 2. Nuova pagina settings
// File: src/app/settings/page.tsx
export default function SettingsPage() {
  return <div>Settings</div>
}
→ DEPLOY CODICE ✅

// 3. Modifica API route
// File: src/app/api/expenses/route.ts
export async function GET(request: Request) {
  // FIX: Aggiunto filtro per data
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate } }
  });
  return Response.json(expenses);
}
→ DEPLOY CODICE ✅
```

### 🔄 Rebuild Container - Esempi
```json
// 1. Aggiunta nuova libreria
// File: package.json
{
  "dependencies": {
    "react-datepicker": "^4.8.0"  // ← NUOVA
  }
}
→ REBUILD CONTAINER 🔄

// 2. Update Prisma schema
// File: prisma/schema.prisma
model Expense {
  id        String   @id @default(cuid())
  // ... campi esistenti
  tags      String[] // ← NUOVO CAMPO
}
→ REBUILD CONTAINER 🔄

// 3. Modifica Dockerfile
// File: Dockerfile
RUN npm ci && \
    npm install -g sharp-cli  // ← AGGIUNTA
→ REBUILD CONTAINER 🔄
```

---

## 💡 Best Practices

### Durante lo Sviluppo
1. **Lavora sempre in locale** con `npm run dev`
2. **Testa tutto** prima di deployare
3. **Commit frequenti** con messaggi chiari
4. **Usa branch** per feature grandi

### Prima del Deploy
```bash
# Checklist veloce:
□ Codice testato in locale?
□ Nessun errore TypeScript? (npm run type-check)
□ Nessun errore ESLint? (npm run lint)
□ Commit fatto con messaggio chiaro?
□ Deciso metodo deployment (Codice vs Container)?
```

### Dopo il Deploy
```bash
# Verifica rapida:
□ Sito risponde? (curl -I https://eiexpenses-container.azurewebsites.net)
□ Autenticazione funziona?
□ Feature modificata funziona?
□ Nessun errore nei log? (az webapp log tail ...)
```

---

## 🚨 Troubleshooting

### Deploy Codice non funziona?
```bash
# 1. Verifica build locale
npm run build
# ↑ Deve completare senza errori

# 2. Verifica ZIP creato
ls -lh deploy.zip
# ↑ Deve essere ~50-100MB

# 3. Se fallisce, usa Container Full
./deploy-full.sh
```

### Container Full troppo lento?
```bash
# Usa cache Docker layers
docker build --cache-from acreiexpenses.azurecr.io/ei-expenses:latest \
  -t ei-expenses:latest .
```

---

## 📚 Script Disponibili

| Script | Descrizione | Tempo | Uso |
|--------|-------------|-------|-----|
| `deploy-code.sh` | Deploy solo codice | 2-3 min | Modifiche quotidiane |
| `deploy-full.sh` | Rebuild container completo | 10-15 min | Dipendenze, schema |
| `deploy-check.sh` | Verifica deployment | 30 sec | Post-deploy check |

---

## 🎓 Quando in Dubbio?

**Regola d'Oro**:
> Se la modifica funziona in locale senza `npm install`,
> probabilmente puoi usare **Deploy Codice**.

**Se non sei sicuro?**
1. Prova prima **Deploy Codice** (veloce)
2. Se qualcosa non funziona, fai **Container Full**
3. Nel dubbio, chiedi a Claude! 🤖

---

**Last Updated**: 2025-11-02
**Version**: 1.0
**Maintained By**: Claude Code Assistant
