# Test Layout

- `unit/`: deterministic Node tests for core, app, UI, release, and generated-runtime contracts.
- `browser/`: real-Chrome static and functional checks.
- `e2e/`: complete user workflows and persistence behavior.
- `visual/`: real-KML responsive and interaction-state screenshots plus geometry assertions.
- `run_full_check.sh`: the six-phase entrypoint used locally and in release preparation.

Common commands:

```bash
npm run test:unit
./tests/run_full_check.sh
npm run test:visual:capture
```

Keep pure behavior in `unit`, DOM/runtime behavior in `browser`, multi-step workflows in `e2e`, and layout or screenshot assertions in `visual`.
