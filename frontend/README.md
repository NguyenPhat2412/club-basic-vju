# VJU Club Frontend

Frontend for the VJU Club management system. The application uses the Next.js App Router, with routes in `src/app` and feature modules in `src/modules`.

## Run Locally

Requirements: Node.js 20+ and pnpm 12 (see the `packageManager` field in `package.json`). From this directory:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The backend should be running locally for API-backed features.

## Checks

```bash
pnpm lint
pnpm build
```

For full-stack setup and backend configuration, see the repository [README](../../README.md).
