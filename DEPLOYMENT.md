# EI-Expenses - Guida al Deployment su Azure

Questa guida spiega come costruire e pubblicare l'applicazione su Azure Container Apps.

## Prerequisiti

- Docker Desktop installato e avviato
- Azure CLI installato (`az`)
- Accesso all'account Azure con le credenziali corrette
- Git configurato

## Configurazione

### Risorse Azure
- **Container Registry**: `acreiexpenses.azurecr.io`
- **Web App**: `EIExpenses-Container`
- **Resource Group**: `rg-EIExpenses`
- **URL Produzione**: https://eiexpenses-container.azurewebsites.net/

### Chiavi API (Build-time)
Queste chiavi devono essere passate durante la build perché sono usate nel codice client-side:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCbvfi6w5BiE4nxipUL8KAXb4mTNPSDZGk
```

> **Nota**: Le variabili `NEXT_PUBLIC_*` vengono incorporate nel bundle JavaScript durante la build. Le altre variabili (DATABASE_URL, AZURE_STORAGE_CONNECTION_STRING, ecc.) sono configurate su Azure e lette a runtime.

## Processo di Deployment

### 1. Verifica Stato Attuale

```bash
# Controlla che Docker sia in esecuzione
docker ps

# Verifica le immagini esistenti
docker images acreiexpenses.azurecr.io/ei-expenses

# Controlla lo stato di Azure
az webapp show --name EIExpenses-Container --resource-group rg-EIExpenses --query "state" -o tsv
```

### 2. Build dell'Immagine Docker

```bash
# Build con la chiave Google Maps (OBBLIGATORIO per il funzionamento di FUEL expenses)
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCbvfi6w5BiE4nxipUL8KAXb4mTNPSDZGk \
  -t acreiexpenses.azurecr.io/ei-expenses:vX.X \
  -t acreiexpenses.azurecr.io/ei-expenses:latest \
  .
```

Sostituisci `vX.X` con il numero di versione (es. `v2.4`, `v2.5`, ecc.)

**Tempo stimato**: 3-5 minuti

### 3. Login su Azure Container Registry

```bash
az acr login --name acreiexpenses
```

### 4. Push dell'Immagine

```bash
# Push entrambi i tag
docker push acreiexpenses.azurecr.io/ei-expenses:vX.X
docker push acreiexpenses.azurecr.io/ei-expenses:latest
```

**Tempo stimato**: 1-3 minuti (dipende dalla connessione)

### 5. Aggiorna Azure Web App

```bash
# Aggiorna la configurazione del container
az webapp config container set \
  --name EIExpenses-Container \
  --resource-group rg-EIExpenses \
  --container-image-name acreiexpenses.azurecr.io/ei-expenses:vX.X

# Riavvia l'applicazione
az webapp restart --name EIExpenses-Container --resource-group rg-EIExpenses
```

### 6. Verifica il Deployment

```bash
# Attendi ~30 secondi per il riavvio, poi verifica
curl -s -o /dev/null -w "%{http_code}" -L https://eiexpenses-container.azurewebsites.net/
```

Risultato atteso: `200`

## Deployment Rapido (Tutto in Uno)

Copia ed esegui questi comandi in sequenza:

```bash
# Imposta la versione
VERSION=v2.4

# Build
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCbvfi6w5BiE4nxipUL8KAXb4mTNPSDZGk \
  -t acreiexpenses.azurecr.io/ei-expenses:$VERSION \
  -t acreiexpenses.azurecr.io/ei-expenses:latest \
  .

# Login e Push
az acr login --name acreiexpenses
docker push acreiexpenses.azurecr.io/ei-expenses:$VERSION
docker push acreiexpenses.azurecr.io/ei-expenses:latest

# Deploy
az webapp config container set \
  --name EIExpenses-Container \
  --resource-group rg-EIExpenses \
  --container-image-name acreiexpenses.azurecr.io/ei-expenses:$VERSION

az webapp restart --name EIExpenses-Container --resource-group rg-EIExpenses

# Verifica (attendi 30 secondi)
sleep 30
curl -s -o /dev/null -w "%{http_code}" -L https://eiexpenses-container.azurewebsites.net/
```

## Rollback

Se qualcosa va storto, puoi tornare alla versione precedente:

```bash
# Torna alla versione precedente (es. v2.3)
az webapp config container set \
  --name EIExpenses-Container \
  --resource-group rg-EIExpenses \
  --container-image-name acreiexpenses.azurecr.io/ei-expenses:v2.3

az webapp restart --name EIExpenses-Container --resource-group rg-EIExpenses
```

### Versioni Disponibili

Per vedere tutte le versioni disponibili:

```bash
az acr repository show-tags --name acreiexpenses --repository ei-expenses --output table
```

## Troubleshooting

### Docker non si avvia
- Avvia Docker Desktop manualmente
- Su Windows: controlla che WSL2 sia configurato

### Errore "Resource group not found"
- Il resource group corretto è `rg-EIExpenses` (non `EIExpenses`)

### Build fallisce con errori npm
- Verifica la connessione internet
- Se fallisce con ECONNRESET, riprova (problema di rete)

### App non risponde dopo il deploy
1. Controlla i log: `az webapp log tail --name EIExpenses-Container --resource-group rg-EIExpenses`
2. Verifica le variabili d'ambiente: `az webapp config appsettings list --name EIExpenses-Container --resource-group rg-EIExpenses`
3. Fai rollback alla versione precedente

### Google Maps non funziona
- La chiave deve essere passata al BUILD time con `--build-arg`
- Verifica che la chiave sia corretta
- Controlla la console del browser per errori

## Variabili d'Ambiente Azure

Queste variabili sono configurate su Azure e NON servono al build time:

| Variabile | Descrizione |
|-----------|-------------|
| DATABASE_URL | Connection string Azure SQL |
| AZURE_STORAGE_CONNECTION_STRING | Storage per ricevute |
| OPENAI_API_KEY | OCR con GPT-4 Vision |
| NEXTAUTH_SECRET | Secret per autenticazione |
| NEXTAUTH_URL | URL dell'app |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Anche su Azure per coerenza |
| FEATURE_GOOGLE_MAPS | true |

Per visualizzarle:
```bash
az webapp config appsettings list --name EIExpenses-Container --resource-group rg-EIExpenses --query "[].name" -o tsv
```

## Storico Versioni

| Versione | Data | Note |
|----------|------|------|
| v2.4 | 2025-11-23 | Voicebot integration con token su Blob Storage |
| v2.3 | 2025-11-19 | Fix roundtrip FUEL + Google Maps build-time |
| v2.2 | 2025-11-04 | Multi-currency export con ricevute |
| v2.1 | 2025-11-04 | Miglioramenti export |
| v2.0 | 2025-11-02 | Major release |

---

*Ultimo aggiornamento: 2025-11-23*
