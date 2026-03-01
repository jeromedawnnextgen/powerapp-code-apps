# ALM Strategy for Power Apps Code Apps

## Environment Topology

```
Dev (personal)  →  Test (shared)  →  Prod
```

## Connection Strategy Per Environment

### Dev
- Use direct connection IDs (`pac code add-data-source -a ... -c ...`)
- Personal connections, fast iteration
- Never committed to pipelines

### Test & Prod
- Use connection references (`pac code add-data-source -a ... -cr ... -s ...`)
- Solution-aware, environment-portable
- Deployed via pipeline

## GitHub Actions Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Code App

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 'lts/*'
          
      - name: Install PAC CLI
        run: |
          dotnet tool install --global Microsoft.PowerApps.CLI.Tool
          
      - name: Authenticate PAC CLI
        run: |
          pac auth create --url ${{ secrets.PP_ENV_URL }} `
            --applicationId ${{ secrets.PP_APP_ID }} `
            --clientSecret ${{ secrets.PP_CLIENT_SECRET }} `
            --tenant ${{ secrets.PP_TENANT_ID }}
            
      - name: Build and Deploy
        run: |
          npm ci
          npm run build | pac code push
```

## Required Secrets

| Secret | Description |
|---|---|
| `PP_ENV_URL` | Power Platform environment URL |
| `PP_APP_ID` | Service principal application ID |
| `PP_CLIENT_SECRET` | Service principal secret |
| `PP_TENANT_ID` | Entra tenant ID |

## Solution Packaging

To include your Code App in a solution for promotion:

```powershell
# Add app to solution
pac solution add-reference --path .

# Export solution
pac solution export --path ./solution-exports --name MySolution --managed false

# Import to next environment
pac solution import --path ./solution-exports/MySolution.zip
```
