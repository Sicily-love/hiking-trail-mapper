# Visual Regression Fixtures

`capture_workbench.py` loads the repository's real sample KML in system Chrome and generates:

- four responsive workspace screenshots: 1440, 1024, 390, and 320 pixels wide;
- a mobile route-library bottom sheet;
- a Day-card state with real itinerary data;
- a measurement state with A/B points and elevation readout;
- a two-day segmentation state with the segment editor visible;
- `report.json` with viewport, overflow, overlap, runtime, and mobile-reset assertions.

Run outside the Codex seatbelt sandbox:

```bash
npm run test:visual:capture -- /tmp/outdoor-route-studio
```

Screenshots are generated artifacts rather than committed pixel baselines because satellite tiles and labels can change independently of the application. The deterministic geometry and interaction-state checks fail the command when the UI contract regresses.
