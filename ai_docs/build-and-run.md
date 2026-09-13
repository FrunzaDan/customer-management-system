# Build & Run

## What it is

How to build and run the DB, API, and UI on a dev machine, and the two recurring TLS-trust problems that come up when doing so.

## Key files / paths

- `build.sh` — repo root, compile/test only, no live services.
- `run.sh` — repo root, full dev environment orchestration.
- `DB/Customer_Management_System_DB/Post_Deployment_Scripts/post_deployment_populate_tbl_merchants.sql` — seeds the test login.
- `.run/` — gitignored logs + exported dev TLS cert, written by `run.sh`.

## How it works

**Docker SQL Server (Azure SQL Edge)** — manual equivalent of what `run.sh` automates:
```bash
docker pull mcr.microsoft.com/azure-sql-edge

docker run \
  -e "ACCEPT_EULA=1" \
  -e "MSSQL_SA_PASSWORD=MyStrongPassw0rd?" \
  -p 1433:1433 \
  --name sqlserver \
  --platform linux/arm64 \
  -d mcr.microsoft.com/azure-sql-edge
```
- `sa` password for local dev is `MyStrongPassw0rd?` — matches `appsettings.json`'s `CustomerManagementSystemDB_Docker` connection string and `run.sh`'s `SQL_SA_PASSWORD` default. Local-dev-only credential, not a production secret.
- Container name `sqlserver`, port `1433`. `run.sh` picks `--platform linux/arm64` automatically only on Apple Silicon Macs (`uname -s == Darwin && uname -m == arm64`); everywhere else it defaults to `linux/amd64`. Both are overridable via env var.
- Azure SQL Edge does **not** ship `sqlcmd`/`mssql-tools` inside the container, so readiness can't be probed with the usual `docker exec ... sqlcmd` trick — see step 2 below for how `run.sh` works around that.

**`build.sh`** — CI-style, one-shot: `dotnet restore`/`build`/`test` on the API solution, `dotnet build` the DB `.sqlproj`, then `npm ci && npm run build` for Angular. Doesn't start anything; just proves everything compiles and tests pass. Run before committing API/DB/UI changes.

**`run.sh`** — full local dev environment, idempotent (safe to re-run):
1. Starts Docker Desktop if not running (macOS: `open -a Docker`), starts/creates the `sqlserver` container if needed (existing container is `docker start`ed, not recreated). `SQL_DATABASE` defaults to `Customer_Management_System_DB`, overridable via env var.
2. Installs `sqlpackage` (pinned to `170.3.93` — newer releases can need a .NET runtime patch this machine doesn't have) as a global dotnet tool if missing, builds the DB `.sqlproj`, and publishes the `.dacpac`, retrying with jitter (no `sqlcmd` in the container to probe readiness with, so it retries the *real* publish instead) until SQL Server accepts connections or 180s elapse.
3. Starts the API in the background (`dotnet run --launch-profile https`, `https://localhost:7145`), waits for `/swagger/index.html` to respond — and now **hard-fails with a clear error** if it doesn't come up within 60s, instead of silently continuing into a broken UI-only session.
4. Extracts the API's live TLS cert (via `openssl s_client | openssl x509`) into `.run/dev-cert.pem` and sets `NODE_EXTRA_CA_CERTS` to it, so Node's `fetch()` (used during Angular SSR) trusts it.
5. Starts the Angular dev server in the foreground (`npm start`, `http://localhost:4200`). `Ctrl+C` stops both API and Angular (trap on `EXIT INT TERM`).

**Test login** (seeded by the post-deployment script, skipped if the merchant already exists):
- Merchant ID: `TestMerchantID`
- Password: `Merchant123`

## Gotchas / conventions

- **One-time local machine setup, not handled by either script**: the ASP.NET Core HTTPS dev certificate must be trusted at the OS level — `dotnet dev-certs https --trust`.
- **Browser TLS trust** (`ERR_CERT_AUTHORITY_INVALID` in the browser, login fails with the UI's `status === 0` message, see [angular-frontend](angular-frontend.md)): running `dotnet dev-certs https --export-path` **regenerates** the dev cert rather than exporting the existing one, desyncing "the cert Kestrel serves" from "the cert the OS trusts" (multiple `localhost` dev certs end up in the login keychain). Fix: `dotnet dev-certs https --clean && dotnet dev-certs https --trust`. Never use `--export-path` to "just get the current cert" — it doesn't.
- **Node/SSR TLS trust** (silent `AbortError`s in the terminal for guarded routes; page still works after client-side hydration): Angular SSR makes real `fetch()` calls from **Node**, whose TLS stack doesn't consult the per-user login keychain the way a browser or `curl` does — so even an OS-trusted cert can fail Node's handshake. This is why `run.sh` step 4 exists. Separate from the browser-trust problem above; fixing one does not fix the other.
- `sqlpackage` version is pinned deliberately (see comment in `run.sh`) — don't "helpfully" bump it without checking it runs against the .NET runtime actually installed.
- `run.sh`'s API-readiness wait and its later cert-extraction step both need the API's port — they now share one `$API_PORT` variable instead of each re-deriving it from `$API_URL` independently.
