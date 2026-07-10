# Script Layout

- `build/`: deterministic source-to-HTML generation and Vite release builds.
- `release/`: version bumping, metadata checks, release document sync, and the complete release preparation entrypoint.
- `maintenance/`: occasional source-cleanup utilities that are not part of normal builds.

Use the package scripts from the repository root instead of calling implementation files directly:

```bash
npm run sync:release
npm run build
npm run release:prepare
npm run version:bump -- patch --zh "..." --en "..."
```

New scripts should enter the smallest matching directory. Browser assertions belong in `tests/browser`, not under `scripts`.
