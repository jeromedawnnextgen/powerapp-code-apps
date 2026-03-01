# Troubleshooting

## Local Network Access Blocked (Chrome/Edge)

**Symptom:** App loads but connector calls fail in local dev mode.

**Cause:** Since Dec 2025, Chrome/Edge block requests from public origins to localhost by default.

**Fix:**
1. Click the lock icon in the browser address bar
2. Grant "Local Network Access" permission
3. Reload the page

For iframe embeds: add `allow="local-network-access"` to the `<iframe>` tag.

---

## Schema Changed, Generated Files Are Stale

**Symptom:** TypeScript errors on generated service/model files after a connector schema update.

**Fix:** Delete and re-add the data source.

```powershell
pac code delete-data-source -a "shared_sql" -ds "MyTable"
pac code add-data-source -a "shared_sql" -c "<connectionId>" -t "[dbo].[MyTable]" -d "<dataset>"
```

There is no refresh command. This is a current platform limitation.

---

## `pac code push` Fails with Auth Error

**Symptom:** `pac code push` returns 401 or auth failure.

**Fix:**
```powershell
pac auth clear
pac auth create
pac env select --environment <envId>
```

---

## App Doesn't Reflect Latest Build

**Symptom:** Deployed app shows old version after `pac code push`.

**Fix:** Hard refresh the app in browser (`Ctrl+Shift+R`). Code Apps are cached at the CDN level and may take a few minutes to propagate.

---

## Connection Reference Not Found

**Symptom:** `pac code add-data-source -cr ...` fails with "connection reference not found".

**Fix:** Verify the logical name:
```powershell
pac code list-connection-references -env <envUrl> -s <solutionId>
```

Ensure the connection reference exists in the solution and the solution is in the environment you're authenticated to.
