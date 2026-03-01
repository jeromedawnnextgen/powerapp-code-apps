# ⚡ Power Apps Code Apps — Enterprise Starter Kit

> A production-ready reference repo for building, connecting, and deploying **Power Apps Code Apps** using TypeScript, the Power Apps SDK, and the PAC CLI.
>
> Built and maintained by [Jerome | NextGen PowerApps](https://github.com/NextGenPowerApps)

---

## 📋 Table of Contents

- [What Are Code Apps?](#what-are-code-apps)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Repo Structure](#repo-structure)
- [Quickstart](#quickstart)
- [Connecting to Data](#connecting-to-data)
  - [Nontabular Sources (e.g. Office 365 Users)](#nontabular-data-sources)
  - [Tabular Sources (e.g. SQL / SharePoint)](#tabular-data-sources)
  - [Stored Procedures](#stored-procedures)
  - [Connection References (ALM-Ready)](#connection-references-alm-ready)
- [Local Development](#local-development)
- [Build & Deploy](#build--deploy)
- [System Configuration & Security](#system-configuration--security)
- [ALM & Environment Strategy](#alm--environment-strategy)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Resources](#resources)

---

## What Are Code Apps?

**Power Apps Code Apps** are a first-class app type on the Power Platform that lets you build apps using standard web technologies — TypeScript, React, Vite — while still connecting to Power Platform connectors, Dataverse, and Azure services.

Unlike Canvas Apps or Model-Driven Apps, Code Apps give you:

| Capability | Canvas App | Code App |
|---|---|---|
| Custom TypeScript/React | ❌ | ✅ |
| Power Platform Connectors | ✅ | ✅ |
| Typed data models (auto-generated) | ❌ | ✅ |
| Full control over UI | Limited | ✅ |
| Standard web tooling (Vite, npm, ESLint) | ❌ | ✅ |
| Deployed to Power Platform endpoint | ✅ | ✅ |

Code Apps are ideal when you need **full UI/UX control** but still want to leverage the **Power Platform connector ecosystem and authentication layer**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Machine                        │
│  ┌──────────┐   npm run build   ┌─────────────────────────┐ │
│  │ Vite App │ ────────────────► │     pac code push       │ │
│  │(TypeScript│                  └────────────┬────────────┘ │
│  │ /React)  │                               │               │
│  └──────────┘                               ▼               │
│  ┌──────────┐   npm run dev    ┌─────────────────────────┐  │
│  │  Local   │ ────────────────►│  localhost (Local Play) │  │
│  │ Dev Mode │                  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ pac code push
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Power Platform Environment                   │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────────────────┐  │
│  │  Code App Host   │────►│  Power Platform Connectors   │  │
│  │  (Public HTTPS) │     │  Office365 / SQL / SharePoint│  │
│  └─────────────────┘     └──────────────────────────────┘  │
│           │                           │                      │
│           ▼                           ▼                      │
│  ┌─────────────────┐     ┌──────────────────────────────┐  │
│  │  Entra ID Auth  │     │     Azure / Dataverse         │  │
│  └─────────────────┘     └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

The app is **published to a publicly accessible HTTPS endpoint** via `pac code push`. Authentication and authorization are handled by Power Platform — your app code never stores user credentials.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | LTS | Required for npm/Vite |
| [Power Platform CLI](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) | ≥ 1.51.1 | For `pac code` commands |
| [Git](https://git-scm.com/) | Any | Source control |
| Power Platform Environment | — | Must have Code Apps feature enabled |
| Power Apps License | Per-app or Per-user | Required to publish |

> **Note:** Starting with [Power Apps SDK](https://www.npmjs.com/package/@microsoft/power-apps) v1.0.4+, an npm-based CLI is included and will eventually replace the PAC CLI `pac code` commands. Both are documented here.

### Enable Code Apps in Your Environment

Code Apps must be enabled at the environment level before you can publish. See [Power Apps Code Apps Overview](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview#enable-code-apps-on-a-power-platform-environment) for steps.

---

## Apps in This Repo

| Folder | Description | Stack |
|---|---|---|
| [`ticketing-app/`](./ticketing-app/) | Ticketing system on Microsoft Dataverse — MDA-inspired UI | React 19, Vite 7, TypeScript, Dataverse |

> More apps coming. Each app lives in its own folder with its own `README.md`, `package.json`, and `power.config.json`.

---

## Repo Structure

```
powerapp-code-apps/
├── ticketing-app/              # ← Ticketing system (start here)
│   ├── src/
│   │   ├── App.tsx             # Main app component
│   │   ├── App.css             # All styles
│   │   └── generated/          # Auto-generated by pac code add-data-source
│   │       ├── models/         # TypeScript data models
│   │       └── services/       # Typed service classes
│   ├── power.config.json       # App registration (appId, environmentId)
│   ├── vite.config.ts
│   ├── package.json
│   └── README.md               # App-specific setup & dev guide
├── alm-strategy.md             # Dev → Test → Prod ALM guidance
├── troubleshooting.md          # Common errors and fixes
├── bootstrap.ps1               # One-command environment setup script
├── deploy.ps1                  # CI/CD deploy script
├── useConnector.ts             # Reusable connector hook pattern
├── .env.example                # Environment variable template
└── README.md                   # You are here
```

> **Important:** Never commit the `/generated/` folder's contents as source-of-truth. It is regenerated by `pac code add-data-source`. Treat it like a build artifact — but *do* commit it so team members don't need to re-run setup locally.

---

## Quickstart

### 1. Clone and Bootstrap

```bash
git clone https://github.com/NextGenPowerApps/powerapps-code-apps.git
cd powerapps-code-apps
npm install
```

Or start fresh from the official Vite template:

```bash
npx degit github:microsoft/PowerAppsCodeApps/templates/vite my-app
cd my-app
npm install
```

### 2. Authenticate and Select Environment

```bash
pac auth create
pac env select --environment <Your Environment ID>
```

Sign in with your Power Platform account when prompted. This binds your CLI session to a specific environment — all `pac code` commands will target it.

### 3. Initialize the Code App

```bash
pac code init --displayname "My Code App"
```

This registers the app in your selected environment and sets up the project metadata.

### 4. Run Locally

```bash
npm run dev
```

Open the **Local Play** URL in the same browser profile you used to authenticate. 

> ⚠️ **Chrome/Edge Local Network Block (Dec 2025+):** Browsers now block public-to-local requests by default. You'll need to grant local network access permission when prompted. For embedded/iframe scenarios, add `allow="local-network-access"` to the iframe tag.

---

## Connecting to Data

Code Apps connect to Power Platform connectors — the same connector ecosystem used by Canvas Apps and Power Automate.

### Step 1: Create a Connection in Power Apps

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Navigate to **Connections** in the left nav
3. Select **+ New connection**, choose your connector, and complete authentication

> Currently, connections must be created in the Power Apps portal. Creating connections via PAC CLI is not yet supported (coming in a future release).

**Unsupported connectors (as of Feb 2026):**
- Excel Online (Business)
- Excel Online (OneDrive)

### Step 2: Get Connection Metadata

**Via PAC CLI (recommended):**

```powershell
pac connection list
```

Output includes **Connection ID** and **API Name** — you need both.

**Via Power Apps URL:**

Open a connection's detail page. The URL format is:
```
https://make.powerapps.com/environments/{envId}/connections/{apiName}/{connectionId}/details
```

---

### Nontabular Data Sources

Use for connectors like Office 365 Users, Microsoft Teams, Outlook, etc.

```powershell
pac code add-data-source `
  -a "shared_office365users" `
  -c "aaaaaaaa000011112222bbbbbbbbbbbb"
```

This auto-generates typed files in `/generated/`:
- `Office365UsersModel.ts` — request/response type definitions
- `Office365UsersService.ts` — callable service methods

**Using the generated service in your app:**

```typescript
import { Office365UsersService } from './generated/services/Office365UsersService';
import type { User } from './generated/models/Office365UsersModel';

// Fetch current user profile
const profile = (
  await Office365UsersService.MyProfile_V2(
    "id,displayName,jobTitle,userPrincipalName"
  )
).data;

// Fetch user photo with fallback
let photoData: string | null = null;
try {
  photoData = (
    await Office365UsersService.UserPhoto_V2(profile.id ?? profile.userPrincipalName)
  ).data;
} catch {
  // Fallback: try userPrincipalName if id fails
  if (profile.userPrincipalName) {
    photoData = (
      await Office365UsersService.UserPhoto_V2(profile.userPrincipalName)
    ).data;
  }
}

if (photoData) setPhoto(`data:image/jpeg;base64,${photoData}`);
```

---

### Tabular Data Sources

Use for SQL Server, SharePoint lists, Dataverse, and other tabular connectors.

**Discover available datasets first:**

```powershell
# List datasets for a connection
pac code list -a "shared_sql" -c "<connectionId>" --datasets

# List tables in a dataset
pac code list -a "shared_sql" -c "<connectionId>" -d "<datasetName>" --tables
```

**Add the data source:**

```powershell
pac code add-data-source `
  -a "shared_sql" `
  -c "aaaaaaaa000011112222bbbbbbbbbbbb" `
  -t "[dbo].[EmployeeInformation]" `
  -d "yourserver.database.windows.net,yourdb"
```

**Using the generated CRUD service:**

```typescript
import { EmployeeInformationService } from './generated/services/EmployeeInformationService';

// Full CRUD surface — all typed
await EmployeeInformationService.getall();
await EmployeeInformationService.get(id);
await EmployeeInformationService.create(newRecord);
await EmployeeInformationService.update(id, changedFields);
await EmployeeInformationService.delete(id);
```

---

### Stored Procedures

```powershell
pac code add-data-source `
  -a "shared_sql" `
  -c "<connectionId>" `
  -d "yourserver.database.windows.net,yourdb" `
  -sp "[dbo].[GetRecordById]"
```

> ⚠️ **Schema change gotcha:** If your connector schema changes (new columns, renamed fields, etc.), there is no `refresh` command. You must **delete and re-add** the data source:
> ```powershell
> pac code delete-data-source -a "shared_sql" -ds "EmployeeInformation"
> pac code add-data-source -a "shared_sql" -c "<connectionId>" -t "[dbo].[EmployeeInformation]" -d "<dataset>"
> ```

---

### Connection References (ALM-Ready)

**This is the production pattern.** Direct connection IDs are user-specific and environment-specific — they break when you move solutions between Dev, Test, and Prod. Connection References solve this.

**Step 1: Get your Solution ID**

```powershell
pac solution list --json | ConvertFrom-Json | Format-Table
```

Copy the `Id` field for your target solution.

**Step 2: List Connection References in that Solution**

```powershell
pac code list-connection-references -env <environmentURL> -s <solutionID>
```

**Step 3: Add the Data Source via Connection Reference**

```powershell
pac code add-data-source `
  -a "shared_sql" `
  -cr "cr_mysolution_sqlconnection" `
  -s "<solutionId>"
```

The app now resolves the connection at runtime from the solution's connection reference — meaning it works correctly in every environment without code changes.

---

## Local Development

```bash
npm run dev
```

- Opens a **Local Play** URL for testing in browser
- Hot-reloads on file save
- Connects to live Power Platform connectors via your authenticated PAC session

> Open the Local Play URL in the **same browser profile** as your Power Platform tenant — connector auth flows depend on your Entra session.

---

## Build & Deploy

```powershell
npm run build | pac code push
```

- `npm run build` compiles TypeScript and bundles via Vite (`tsc -b && vite build`)
- `pac code push` publishes the build artifact to Power Platform

On success, you receive a **Power Apps play URL** for the deployed app.

### Hiding the Power Apps Header

When sharing the app URL, append `?hideNavBar=true` to remove the Power Apps chrome:

```
# With header (default)
https://apps.powerapps.com/play/e/{envId}/a/{appId}

# Without header (clean embed)
https://apps.powerapps.com/play/e/{envId}/a/{appId}?hideNavBar=true
```

---

## System Configuration & Security

### Hosted App Code

When published, your Code App is hosted on a **publicly accessible HTTPS endpoint**. This means:

- ✅ The app shell/code is public
- ✅ **Data is not** — data calls require authenticated connector sessions
- ❌ **Never hardcode credentials, API keys, or sensitive data in app code**
- ❌ **Never store sensitive user/org data in the app bundle itself**

All sensitive data must live in a connector-backed data source that enforces auth. Store config values (environment-specific URLs, feature flags, etc.) in:

- Dataverse configuration tables
- Azure App Configuration (accessed via connector or Azure Function)
- Environment variables at the Power Platform solution level

### Environment Variables Pattern

```typescript
// ✅ Good — config resolved at runtime from a connector/service
const config = await ConfigService.getAppConfig();
const apiBaseUrl = config.apiBaseUrl;

// ❌ Bad — hardcoded, environment-specific, leaks in bundle
const apiBaseUrl = "https://prod-api.mycompany.com";
```

---

## ALM & Environment Strategy

| Environment | Connection Strategy | Deploy Method |
|---|---|---|
| Dev | Direct connection IDs (personal) | `pac code push` manually |
| Test | Connection References in solution | Pipeline: `pac code push` |
| Prod | Connection References in solution | Pipeline: solution import |

The recommended pattern is:

1. Use **direct connections** while building locally in Dev
2. Switch to **connection references** before checking into source control
3. Package app in a **solution** and promote via **Dev → Test → Prod** pipelines

See [`docs/alm-strategy.md`](./docs/alm-strategy.md) for a full pipeline setup guide.

---

## Known Limitations

| Limitation | Status |
|---|---|
| Cannot create connections via PAC CLI | Planned for future release |
| No schema refresh command (must delete + re-add) | No timeline |
| Excel Online (Business) not supported | No timeline |
| Excel Online (OneDrive) not supported | No timeline |
| Chrome/Edge block local network requests | Workaround: grant browser permission |

---

## Roadmap

- [ ] Add sample app: Employee Directory (Office 365 Users + SQL)
- [ ] Add reusable `useConnector<T>` React hook with error/loading states
- [ ] Add GitHub Actions pipeline for automated `pac code push`
- [ ] Add Dataverse connector example
- [ ] Add Azure Service Bus integration example via Azure Functions proxy

---

## Resources

| Resource | Link |
|---|---|
| Power Apps Code Apps Overview | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview) |
| PAC CLI Reference | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction) |
| `pac code` Commands | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/code) |
| Power Apps SDK (npm) | [npmjs.com](https://www.npmjs.com/package/@microsoft/power-apps) |
| Connect to Azure SQL Guide | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/connect-to-azure-sql) |
| Connection References | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-connection-reference) |
| Vite | [vite.dev](https://vite.dev) |

---

## License

MIT — feel free to fork, extend, and productize.

---

> Built by Jerome | [NextGen PowerApps](https://github.com/NextGenPowerApps) — helping teams move from demo-level to enterprise-grade Power Platform solutions.
