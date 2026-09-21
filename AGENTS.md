# NEXVION project rules

## Source of truth
- The product spec is `docs/PRD.md`. Read the relevant section before starting any task.
- Build only **P0** items first. Do not start P1/P2 work unless asked.
- If the PRD and a request conflict, stop and ask.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: FastAPI + Pydantic
- Databases: PostgreSQL (structured) + InfluxDB (time series)
- Messaging: MQTT (edge to server), WebSocket (server to dashboard)
- Vision/ML: OpenCV + YOLO, scikit-learn (Random Forest)
- Run locally with Docker Compose

## Non-negotiable product rules
- Every data record carries a `provenance` field: REAL_SITE, REAL_LAB, PUBLIC_PROXY or SIMULATED.
- Show a persistent **DEMO DATA** banner whenever any visible value is SIMULATED.
- RUL must always show a status: UNAVAILABLE, DEMO, ESTIMATED or VALIDATED. Never show a bare number.
- The dashboard is advisory only. It must never start or stop the conveyor.
- A critical joint must always be reflected in the conveyor-level risk index.
- Severity is shown with colour + shape + label (colour-blind safe).
- Colour is reserved for abnormal states; keep the base UI grey and calm.
- Alerts above WATCH need corroboration from at least 2 different sensor types, except configured safety rules.

## Working style
- Before coding a task, write a short plan and wait for approval.
- Work one module at a time; keep changes small and runnable.
- Write a test for every new API endpoint.
- Never commit secrets; use `.env` and provide `.env.example`.
- After each task, summarise what changed and how to run/verify it.
