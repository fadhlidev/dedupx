# DedupX

## Run

```bash
bun run index.ts
```

Or with hot reload:

```bash
bun --hot src/index.ts
```

## Build

```bash
bun run build   # outputs 'dedupx' binary
bun run clean  # removes binary
```

## Entry

`src/index.ts` - configured as the module entry in `package.json`.

## Notes

- **Workflow**: Always develop using `nix develop` to ensure the correct toolchain.
- **New Functions**: If you introduce a new function, you MUST also create corresponding tests for it.
- **Imports**: Use `@/` path alias instead of relative paths (e.g., `import { foo } from "@/utils"` not `../utils`).

## Commit Messages
Format: `[action]: [message]` (e.g., `add: new endpoint`, `fix: memory leak in cache`)