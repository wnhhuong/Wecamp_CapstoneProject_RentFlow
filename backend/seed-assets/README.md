# Seed assets

These files are deterministic development fixtures copied from the user-provided
`uploads` archive. The seed copies this directory to `backend/uploads` before it
creates database records, so every stored image path resolves locally.

- `rooms`: four images for each available source room; some of the 24 seeded
  rooms intentionally reuse a source set.
- `consumption`: reusable meter images for monthly request history.
- `repair`: ticket evidence images.
- `checkout`: final meter evidence for checkout scenarios.
- `signatures`: contract signatures reused across demo contracts.

The assets are for local development and automated test fixtures only. Runtime
uploads remain ignored by Git. To rebuild the database, configure a disposable
MongoDB database and run:

```bash
npm run seed -- --reset
```

Set `SEED_REFERENCE_DATE` to an ISO timestamp or `YYYY-MM-DD` when a stable date
is required in test or CI runs.
