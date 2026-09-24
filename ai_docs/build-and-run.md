# Build & Run

## What it is

How to build, test and run the database, API and UI locally.

## Key files / paths

- `build.sh` — restores, builds and tests the API, builds the DB project, then runs `npm ci`, `npm run format:check`, `npm run build` and `ng test` for the UI. Starts nothing.
- `run.sh` — the full dev environment. Safe to re-run.
- `.run/` — logs and the exported dev certificate (gitignored).
- `.vscode/` — shared VS Code tasks (`run.sh`, `build.sh`, `ng serve`, `ng test`), launch configs (API, `ng serve`, `ng test` in Node, "API + UI") and recommended extensions. Same in all three sibling apps. Open the repo root, not `UI/`.
- `DB/CustomerManagement/Scripts/PostDeployment/Seed_Merchant.sql` — the test login.

## How it works

### `run.sh`

1. Starts Docker, then starts or creates the `sqlserver` container (Azure SQL Edge on port 1433). It uses `linux/arm64` on Apple Silicon and `linux/amd64` everywhere else.
2. Installs `sqlpackage` 170.3.93 if it's missing, builds the `.sqlproj`, and publishes it, retrying for up to 180 s until SQL Server answers.
3. Starts the API at `https://localhost:7145` with `ConnectionStrings__Docker` pointing at that container, and waits up to 60 s for it. If the API doesn't come up, the script fails.
4. Exports the API's TLS certificate to `.run/dev-cert.pem` and sets `NODE_EXTRA_CA_CERTS`, so Node (SSR) trusts it.
5. Starts `npm start` at `http://localhost:4203`. `Ctrl+C` stops both.

You can override these environment variables: `SQL_PORT`, `SQL_SA_PASSWORD`, `SQL_DATABASE`, `SQL_CONTAINER_NAME`, `SQL_IMAGE`, `SQL_PLATFORM` and `API_URL`.

### Manual Docker equivalent

```bash
docker run -e "ACCEPT_EULA=1" -e "MSSQL_SA_PASSWORD=MyStrongPassw0rd?" \
  -p 1433:1433 --name sqlserver --platform linux/arm64 -d mcr.microsoft.com/azure-sql-edge
```

### Which database the API uses

- **macOS:** always the Docker container.
- **Windows:** the Docker container if it answers within 3 s. Otherwise the local SQL Server (`ConnectionStrings:LocalSqlServer`, Windows auth).
- The choice is logged at startup. On Windows, start Docker before the API. See [api](api.md).

### Test login

- Username `TestMerchantID`, password `Merchant123`.

## Gotchas / conventions

- **One-time setup:** `dotnet dev-certs https --trust`.
- **Browser shows `ERR_CERT_AUTHORITY_INVALID`:** run `dotnet dev-certs https --clean && dotnet dev-certs https --trust`. Never use `--export-path`, which regenerates the certificate.
- **Node SSR `AbortError`s:** Node doesn't read the keychain. That's why `run.sh` step 4 exists.
- **Pinned versions:**
  - `sqlpackage` is pinned; don't bump it without checking the installed .NET runtime.
  - `DB/CustomerManagement/global.json` pins .NET 8. Keep it.
- **Formatting:** Prettier (`npm run format`, `npm run format:check`), configured the same in all three apps.
- The `sa` password is a local-dev credential only.
