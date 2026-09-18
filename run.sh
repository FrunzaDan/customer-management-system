#!/usr/bin/env bash
# Starts the local dev environment: makes sure the Azure SQL Edge Docker container
# is up, waits for it to accept connections, deploys the DB schema, then starts
# the API (in the background) and the Angular dev server (in the foreground).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_PROJ_DIR="$ROOT_DIR/API/CustomerManagementSystemApi/CustomerManagementSystem.WebAPI"
API_PROJ="$API_PROJ_DIR/CustomerManagementSystem.WebAPI.csproj"
API_LAUNCH_SETTINGS="$API_PROJ_DIR/Properties/launchSettings.json"
DB_DIR="$ROOT_DIR/DB/Customer_Management_System_DB"
DB_PROJ="Customer_Management_System_DB.sqlproj"
DB_DACPAC="$DB_DIR/bin/Debug/Customer_Management_System_DB.dacpac"
UI_DIR="$ROOT_DIR/UI"
RUN_DIR="$ROOT_DIR/.run"

SQL_IMAGE="${SQL_IMAGE:-mcr.microsoft.com/azure-sql-edge}"
SQL_CONTAINER_NAME="${SQL_CONTAINER_NAME:-sqlserver}"
SQL_SA_PASSWORD="${SQL_SA_PASSWORD:-MyStrongPassw0rd?}"
SQL_PORT="${SQL_PORT:-1433}"
# linux/arm64 only matches Apple Silicon; everything else (Linux amd64, Intel Mac) needs
# linux/amd64, or the container either fails outright or silently falls back to slow QEMU
# emulation with no explanation. SQL_PLATFORM still overrides either default if set.
if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
  SQL_PLATFORM="${SQL_PLATFORM:-linux/arm64}"
else
  SQL_PLATFORM="${SQL_PLATFORM:-linux/amd64}"
fi
SQL_DATABASE="${SQL_DATABASE:-Customer_Management_System_DB}"

# Default falls back to the "https" launch profile's applicationUrl (stripped of the
# trailing ";" ASP.NET appends when multiple URLs are configured) so the script doesn't
# silently poll the wrong port if the profile is ever changed; set API_URL yourself to
# override either.
DEFAULT_API_URL="https://localhost:7145"
if [[ -z "${API_URL:-}" ]] && [[ -f "$API_LAUNCH_SETTINGS" ]]; then
  DEFAULT_API_URL="$(sed -nE 's/.*"applicationUrl"[[:space:]]*:[[:space:]]*"(https:\/\/[^";]*).*/\1/p' "$API_LAUNCH_SETTINGS" | head -1)"
  DEFAULT_API_URL="${DEFAULT_API_URL:-https://localhost:7145}"
fi
API_URL="${API_URL:-$DEFAULT_API_URL}"
API_LOG="$RUN_DIR/api.log"
API_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    echo "==> Stopping API (pid $API_PID)"
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Pure-bash TCP probe (no nc/lsof dependency) so a stale process left over from a
# crashed previous run, or an unrelated service, fails fast with a clear message
# instead of a confusing error from deep inside docker/dotnet.
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3<&- 3>&-; return 0; }
  return 1
}

echo "==> [1/6] Checking prerequisites"
missing=()
for cmd in dotnet node npm docker curl; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required tool(s): ${missing[*]}" >&2
  echo "  - .NET SDK: https://dotnet.microsoft.com/download" >&2
  echo "  - Node.js (includes npm): https://nodejs.org/" >&2
  echo "  - Docker Desktop: https://www.docker.com/products/docker-desktop/" >&2
  echo "  - curl: install via your OS package manager" >&2
  exit 1
fi

echo "==> [2/6] Checking Docker"
if ! docker info >/dev/null 2>&1; then
  echo "    Docker daemon is not running."
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "    Starting Docker Desktop..."
    open -a Docker
  else
    echo "    Please start Docker manually and re-run this script." >&2
    exit 1
  fi

  echo -n "    Waiting for Docker to be ready"
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      echo
      break
    fi
    echo -n "."
    sleep 2
  done

  if ! docker info >/dev/null 2>&1; then
    echo "Docker did not become ready in time." >&2
    exit 1
  fi
fi
echo "    Docker is running."

echo "==> [3/6] Checking SQL Server container ('$SQL_CONTAINER_NAME')"
if container_state=$(docker inspect -f '{{.State.Running}}' "$SQL_CONTAINER_NAME" 2>/dev/null); then
  if [[ "$container_state" == "true" ]]; then
    echo "    Container already running."
  else
    echo "    Container exists but is stopped, starting it..."
    docker start "$SQL_CONTAINER_NAME" >/dev/null
  fi
else
  if port_in_use "$SQL_PORT"; then
    echo "Port $SQL_PORT is already in use by something other than the '$SQL_CONTAINER_NAME' container." >&2
    echo "Stop whatever is using it, or set SQL_PORT to a different port and re-run." >&2
    exit 1
  fi
  echo "    Container not found, pulling image and creating it..."
  docker pull "$SQL_IMAGE"
  docker run \
    -e "ACCEPT_EULA=1" \
    -e "MSSQL_SA_PASSWORD=$SQL_SA_PASSWORD" \
    -p "$SQL_PORT:1433" \
    --name "$SQL_CONTAINER_NAME" \
    --platform "$SQL_PLATFORM" \
    -d "$SQL_IMAGE" >/dev/null
fi

mkdir -p "$RUN_DIR"

echo "==> [4/6] Preparing database tooling"
# Pinned to a version known to run against .NET runtimes commonly installed on this
# machine; the latest sqlpackage release can require a newer runtime patch than what's
# available, which fails at launch (not something a "wait longer" fix helps with).
SQLPACKAGE_VERSION="170.3.93"
if ! command -v sqlpackage >/dev/null 2>&1; then
  export PATH="$PATH:$HOME/.dotnet/tools"
fi
if command -v sqlpackage >/dev/null 2>&1 && ! sqlpackage /Version >/dev/null 2>&1; then
  echo "    Installed sqlpackage can't run on this machine's .NET runtime, reinstalling a compatible version..."
  dotnet tool uninstall -g microsoft.sqlpackage >/dev/null 2>&1 || true
fi
if ! command -v sqlpackage >/dev/null 2>&1; then
  echo "    sqlpackage not found, installing as a global dotnet tool..."
  dotnet tool install -g microsoft.sqlpackage --version "$SQLPACKAGE_VERSION"
fi

(
  cd "$DB_DIR"
  dotnet build "$DB_PROJ" --configuration Debug
)

echo "==> [5/6] Deploying database schema (retrying until SQL Server accepts connections)"
# Azure SQL Edge doesn't ship sqlcmd/mssql-tools inside the container, so instead of
# probing readiness separately, we retry the real publish (the actual connection the
# API will use) until it succeeds.
TARGET_CONN="Data Source=localhost,$SQL_PORT;Initial Catalog=$SQL_DATABASE;User ID=SA;Password=$SQL_SA_PASSWORD;TrustServerCertificate=True;Encrypt=True"
PUBLISH_LOG="$RUN_DIR/sqlpackage.log"

published=0
elapsed=0
max_elapsed=180
echo -n "    "
while [[ "$elapsed" -lt "$max_elapsed" ]]; do
  # BlockOnPossibleDataLoss:false — this is a local, disposable dev DB we actively iterate
  # schema on; SSDT's default guard refuses any table rebuild (e.g. adding a PRIMARY KEY)
  # against a table that already has rows, even when the rebuild is actually safe (as it is
  # here), which otherwise makes every retry below fail identically for the full timeout
  # instead of just succeeding.
  if sqlpackage /Action:Publish /SourceFile:"$DB_DACPAC" /TargetConnectionString:"$TARGET_CONN" \
    /p:BlockOnPossibleDataLoss=false >"$PUBLISH_LOG" 2>&1; then
    published=1
    break
  fi
  # Base delay plus random jitter so retries aren't in lockstep and the wait is
  # visible instead of looking hung.
  delay=$(( 3 + RANDOM % 4 ))
  echo -n "."
  sleep "$delay"
  elapsed=$(( elapsed + delay ))
done
echo

if [[ "$published" -ne 1 ]]; then
  echo "Failed to publish database schema within ${max_elapsed}s. Last error:" >&2
  tail -n 20 "$PUBLISH_LOG" >&2 || true
  echo "Full log: $PUBLISH_LOG" >&2
  exit 1
fi
echo "    Database schema is up to date."

echo "==> [6/6] Starting API and Angular client"
API_PORT="${API_URL##*:}"
API_PORT="${API_PORT%%/*}"
if port_in_use "$API_PORT"; then
  echo "Port $API_PORT (needed for the API) is already in use." >&2
  echo "Check for a leftover process from a previous run (or something else bound to it) and stop it, then re-run." >&2
  exit 1
fi

: >"$API_LOG"

ASPNETCORE_ENVIRONMENT=Development dotnet run --project "$API_PROJ" --launch-profile https >"$API_LOG" 2>&1 &
API_PID=$!
echo "    API starting in background (pid $API_PID), logs: $API_LOG"

echo -n "    Waiting for API to come up"
api_ready=0
for _ in $(seq 1 30); do
  if curl -sk "$API_URL/swagger/index.html" >/dev/null 2>&1; then
    echo
    api_ready=1
    break
  fi
  echo -n "."
  sleep 2
done

if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "API process exited early, check $API_LOG" >&2
  exit 1
fi

if [[ "$api_ready" -ne 1 ]]; then
  echo
  echo "API did not become reachable at $API_URL within 60s, check $API_LOG" >&2
  exit 1
fi

echo "    API is up at $API_URL"

# The Angular app runs server-side rendering, and guarded routes make a real fetch()
# call to the API from Node during SSR. Node's fetch validates TLS certs against its
# own CA store, which doesn't include the ASP.NET Core dev cert even when it's trusted
# at the OS level (e.g. via `dotnet dev-certs https --trust`) — that trust lives in the
# per-user login keychain, which Node's --use-system-ca doesn't read. Without this, SSR
# requests to guarded routes fail their TLS handshake and get aborted (the page still
# renders client-side after hydration, but with noisy "AbortError" output).
DEV_CERT_PEM="$RUN_DIR/dev-cert.pem"
if command -v openssl >/dev/null 2>&1 &&
  echo | openssl s_client -connect localhost:"$API_PORT" -servername localhost 2>/dev/null |
    openssl x509 -outform PEM >"$DEV_CERT_PEM" 2>/dev/null &&
  [[ -s "$DEV_CERT_PEM" ]]; then
  export NODE_EXTRA_CA_CERTS="$DEV_CERT_PEM"
else
  echo "    Warning: couldn't extract the API's TLS cert for Node to trust;" >&2
  echo "    SSR requests to guarded routes may log (harmless) AbortErrors." >&2
  rm -f "$DEV_CERT_PEM"
fi

echo "    Starting Angular dev server (Ctrl+C stops both)..."
cd "$UI_DIR"
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm start
