# Customer Management System — Angular UI

Angular 22 frontend for the Customer Management System: zoneless change detection (no `zone.js`), signals for all component state, standalone components, and SSR via `@angular/ssr` (Express server, hydrated client-side).

This isn't usually run standalone in dev — use `./run.sh` from the repo root, which starts the DB, API, and this app together (and wires up TLS trust for SSR's Node-side `fetch()` calls). See the repo root `README.md` and `ai_docs/build-and-run.md` for the full flow.

## Development server

`npm start` (equivalent to `ng serve`) runs this app alone against whatever `CustomerManagementSystemAPI` URL is set in `src/environments/environment.ts` — the API must already be running separately. Navigate to `http://localhost:4200/`.

## Code scaffolding

`ng generate component component-name` (or `directive|service|guard|interface`). New components should be standalone and use `inject()` + signals, matching the rest of the app — see `ai_docs/angular-frontend.md` in the repo root.

## Build

`ng build` (or `npm run build`, used by the repo root `build.sh`). Output goes to `dist/`.

## Running unit tests

`ng test` runs the unit tests via **Vitest** (`@angular/build:unit-test`), not Karma — this project was scaffolded straight onto Vitest, so there's nothing to migrate away from. `describe`/`it`/`expect`/`vi` are globally available, no imports needed. Add `--watch=false` for a single non-interactive run.

## Running end-to-end tests

No e2e test runner is currently configured.

## Further help

`ng help` or the [Angular CLI reference](https://angular.dev/cli). For how this specific app is wired (routing, auth guard, zoneless state, services), see `ai_docs/` in the repo root.
