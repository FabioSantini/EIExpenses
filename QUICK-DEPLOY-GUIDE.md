# 🚀 Quick Deployment Guide - EI-Expenses

Guida rapida per deployare modifiche su Azure.

## 📋 Prima di Deployare

**Checklist veloce**:
```bash
✓ Codice testato in locale con npm run dev
✓ Nessun errore TypeScript
✓ Commit fatto su git
✓ Deciso quale metodo usare (vedi sotto)
```

---

## ⚡ Deploy Veloce (2-3 minuti) - 90% dei casi

**Quando usare**: Modifiche a codice esistente (bugfix, nuove pagine, logica API)

```bash
./deploy-code.sh
```

**Cosa deploy**a:
- ✅ Codice TypeScript/React modificato
- ✅ CSS/Tailwind changes
- ✅ Nuove pagine e componenti
- ✅ API routes modificate
- ✅ Bugfix generici

---

## 🐋 Deploy Completo (10-15 minuti) - Quando necessario

**Quando usare**: Modifiche a dipendenze o infrastruttura

```bash
./deploy-full.sh
```

**Cosa deploya**:
- ✅ Nuove dipendenze (package.json)
- ✅ Modifiche Prisma schema
- ✅ Modifiche Dockerfile
- ✅ Update di librerie
- ✅ **Modifiche a NEXT_PUBLIC_* environment variables** (Google Maps API key, etc.)

---

## 🤔 Quale Usare?

```
Hai modificato package.json?
├─ SI → deploy-full.sh
└─ NO → deploy-code.sh ⚡

Hai modificato Prisma schema?
├─ SI → deploy-full.sh
└─ NO → deploy-code.sh ⚡

Hai cambiato NEXT_PUBLIC_* env vars (Google Maps API)?
├─ SI → deploy-full.sh
└─ NO → deploy-code.sh ⚡

Solo codice .ts/.tsx/.css?
└─ SI → deploy-code.sh ⚡
```

---

## 📝 Workflow Tipico

```bash
# 1. Sviluppo locale
npm run dev
# Test modifiche su http://localhost:3000

# 2. Quando funziona tutto
git add .
git commit -m "Fix: descrizione modifica"

# 3. Deploy
./deploy-code.sh  # o ./deploy-full.sh se necessario

# 4. Verifica
# Vai su https://eiexpenses-container.azurewebsites.net
```

---

## 🔍 Verificare il Deploy

```bash
# Check se l'app risponde
curl -I https://eiexpenses-container.azurewebsites.net

# Vedere i log in tempo reale
az webapp log tail --name EIExpenses-Container --resource-group rg-EIExpenses

# Scaricare tutti i log
az webapp log download --name EIExpenses-Container --resource-group rg-EIExpenses --log-file logs.zip
```

---

## ❌ Cosa Fare se Deploy Fallisce

### Deploy Codice fallito?
```bash
# 1. Verifica build locale
npm run build

# 2. Se build locale OK ma deploy fail, usa deploy completo
./deploy-full.sh
```

### Deploy Completo fallito?
```bash
# 1. Verifica Docker Desktop è attivo
docker ps

# 2. Verifica login Azure
az login

# 3. Riprova
./deploy-full.sh
```

### App non risponde dopo deploy?
```bash
# Vedi i log per capire l'errore
az webapp log tail --name EIExpenses-Container --resource-group rg-EIExpenses

# Restart manuale
az webapp restart --name EIExpenses-Container --resource-group rg-EIExpenses
```

---

## 💡 Tips & Tricks

### Deploy Più Veloce
```bash
# Durante sviluppo, testa in locale il più possibile
npm run dev

# Deploy solo quando una feature è completa
# Non deployare ogni singola modifica
```

### Rollback Veloce
```bash
# Se l'ultimo deploy ha rotto qualcosa
# Option 1: Ripristina commit precedente
git revert HEAD
./deploy-code.sh

# Option 2: Deploy versione precedente del container
az webapp config container set \
  --name EIExpenses-Container \
  --resource-group rg-EIExpenses \
  --docker-custom-image-name acreiexpenses.azurecr.io/ei-expenses:v2.0
```

### Vedere Tutte le Versioni su ACR
```bash
az acr repository show-tags \
  --name acreiexpenses \
  --repository ei-expenses \
  --output table
```

---

## 📚 Risorse

- **Matrice Decisionale Completa**: `DEPLOYMENT-DECISION-MATRIX.md`
- **Checklist Completa**: `DEPLOYMENT-CHECKLIST.md`
- **Logs Azure**: https://portal.azure.com → EIExpenses-Container → Logs

---

## 🆘 Aiuto Veloce

**Domanda**: Posso deployare mentre qualcuno sta usando l'app?
**Risposta**: Si, ma ci saranno 10-30 secondi di downtime durante il restart.

**Domanda**: Quanto spesso posso deployare?
**Risposta**: Quanto vuoi, ma raccogli più modifiche insieme quando possibile.

**Domanda**: I dati nel database vengono persi?
**Risposta**: No, il database è separato. Solo il codice viene aggiornato.

**Domanda**: Come faccio a testare prima di deployare in produzione?
**Risposta**: Testa tutto in locale con `npm run dev` prima di fare deploy.

---

**Last Updated**: 2025-11-02
**Quick Help**: Leggi `DEPLOYMENT-DECISION-MATRIX.md` per dettagli completi
