#!/usr/bin/env bash
# Restores, builds, and tests the .NET solution and the SQL database project,
# then installs dependencies, builds, and tests the Angular app.
# Pass --skip-tests to skip both test steps for a faster sanity build.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SLN="$ROOT_DIR/API/Customer_Management_System_API/CustomerManagementSystem.sln"
DB_DIR="$ROOT_DIR/DB/Customer_Management_System_DB"
DB_PROJ="Customer_Management_System_DB.sqlproj"
UI_DIR="$ROOT_DIR/UI"

SKIP_TESTS=0
for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--skip-tests]" >&2
      exit 1
      ;;
  esac
done

echo "==> [1/7] Checking prerequisites"
missing=()
for cmd in dotnet node npm; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required tool(s): ${missing[*]}" >&2
  echo "  - .NET SDK: https://dotnet.microsoft.com/download" >&2
  echo "  - Node.js (includes npm): https://nodejs.org/" >&2
  exit 1
fi

echo "==> [2/7] Restoring .NET solution"
dotnet restore "$API_SLN"

echo "==> [3/7] Building .NET solution"
dotnet build "$API_SLN" --no-restore --configuration Debug

echo "==> [4/7] Running .NET tests"
if [[ "$SKIP_TESTS" -eq 1 ]]; then
  echo "    Skipped (--skip-tests)"
else
  dotnet test "$API_SLN" --no-build --configuration Debug
fi

echo "==> [5/7] Building database project"
(
  cd "$DB_DIR"
  dotnet restore "$DB_PROJ"
  dotnet build "$DB_PROJ" --no-restore --configuration Debug
)

echo "==> [6/7] Building Angular app"
(
  cd "$UI_DIR"
  npm ci
  npm run build
)

echo "==> [7/7] Running Angular tests"
if [[ "$SKIP_TESTS" -eq 1 ]]; then
  echo "    Skipped (--skip-tests)"
else
  (
    cd "$UI_DIR"
    node_modules/.bin/ng test --watch=false
  )
fi

echo "==> Build complete."
