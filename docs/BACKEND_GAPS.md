# BeltScanX AI Backend Gaps & Frontend Integration Notes

This document catalogues gaps identified between the PRD specification (v2.0) and the current backend implementation (`backend/app`). In accordance with project rules, the frontend does not invent fake data or modify backend files; instead, unbacked features are either hidden in standard mode or marked with "API Gap" in Dev mode (`?dev=1`).

---

## 1. WebSocket Live Stream: Missing `alert` Broadcasts

- **PRD Reference**: Section 10.2 (WebSocket `/ws/live`), Section 6.5 (Alert Engine), Section 7.6 (Alert Center)
- **Current Behavior**:
  - The simulator engine creates `Alert` database records during joint pass processing when health states drop to `WATCH`, `MAINTENANCE_REQUIRED`, or `CRITICAL`.
  - The engine broadcasts `health_update` (per-joint pass), `conveyor_summary` (once per lap), and `scenario_event`.
  - The `alert` message type defined in `backend/app/schemas/telemetry.py` (`AlertMessage`) is **never broadcast** over `/ws/live`.
- **Desired Endpoint/Message**:
  - WebSocket `/ws/live` broadcast payload:
    ```json
    {
      "type": "alert",
      "ts": "2026-09-22T01:00:00.000Z",
      "run_id": "run_20260922_010000_abc123",
      "alert_id": "alt_12345678",
      "conveyor_id": "CV-01",
      "joint_id": "CV01_J02",
      "pass_event_id": "pe_88213",
      "severity": "CRITICAL",
      "state": "ACTIVE",
      "title": "CRITICAL Condition on Joint J02",
      "description": "Joint health dropped to 44.2% with risk score 0.56.",
      "evidence": {
        "contributors": { ... },
        "abnormal_modalities": ["vision", "vibration", "laser"],
        "is_corroborated": true
      },
      "provenance": "SIMULATED"
    }
    ```
- **Frontend Mitigation**:
  - The frontend fetches active alerts on initial load via `GET /api/v1/alerts?state=ACTIVE`.
  - When `conveyor_summary` arrives with a changed `active_alerts_count` or a `health_update` indicates an abnormal state (<85%), the frontend automatically triggers a background refetch of `/api/v1/alerts?state=ACTIVE`.

---

## 2. Missing Prognostics / Breach Prediction Endpoint (`/api/v1/ai/predictions`)

- **PRD Reference**: Section 7.1 (OV-01: Status cards: predicted breaches in 7 d), Section 7.5 (AI-03), Section 10.1
- **Current Behavior**:
  - Backend creates `Prediction` rows in SQLite (`predictions` table with `horizon_hours=168.0`, `p_breach`, `rul_status`, `rul_low_days`, `rul_high_days`).
  - However, no REST router exists under `/api/v1/ai/*` or `/api/v1/predictions`.
- **Desired Endpoint/Message**:
  - `GET /api/v1/ai/predictions/summary?conveyor_id=CV-01&horizon_days=7`
    ```json
    {
      "conveyor_id": "CV-01",
      "horizon_days": 7,
      "predicted_breaches_count": 1,
      "breaching_joints": [
        {
          "joint_id": "CV01_J02",
          "joint_code": "J02",
          "p_breach": 0.58,
          "rul_status": "DEMO",
          "rul_low_days": 7.0,
          "rul_high_days": 12.0
        }
      ],
      "provenance": "SIMULATED"
    }
    ```
- **Frontend Mitigation**:
  - In normal mode, the Predicted Breaches card displays "Not available in this build".
  - In Dev mode (`?dev=1`), it renders an "API Gap: /api/v1/ai/predictions" badge.

---

## 3. Missing Live Sensor Telemetry Endpoint (`/api/v1/sensors/live`)

- **PRD Reference**: Section 7.1 (OV-04: Live sensor summary cards), Section 7.2 (LM-03), Section 10.1
- **Current Behavior**:
  - Raw sensor features are stored in the SQLite `features` table during simulation, but there is no REST route `/api/v1/sensors/*` to query live sensor values or time-series streams.
  - Telemetry available to the frontend is limited to:
    - `speed_mps` from `conveyor_summary` and `pass-events`.
    - `load_pct` from `pass-events`.
    - Per-modality quality scores and anomaly scores from `health_update.contributors` (`vision`, `vibration`, `thermal`, `laser`).
- **Desired Endpoint/Message**:
  - `GET /api/v1/sensors/live?conveyor_id=CV-01`
    ```json
    {
      "conveyor_id": "CV-01",
      "station_id": "ST-01",
      "timestamp": "2026-09-22T01:00:00.000Z",
      "sensors": [
        { "modality": "speed", "value": 2.45, "unit": "m/s", "status": "NORMAL" },
        { "modality": "load", "value": 80.0, "unit": "%", "status": "NORMAL" },
        { "modality": "vibration", "rms_mm_s": 2.2, "kurtosis": 3.0, "status": "NORMAL" },
        { "modality": "thermal", "hotspot_delta_t_c": 1.5, "status": "NORMAL" },
        { "modality": "laser", "lift_height_mm": 0.0, "step_height_mm": 0.5, "status": "NORMAL" }
      ],
      "provenance": "SIMULATED"
    }
    ```
- **Frontend Mitigation**:
  - The frontend constructs sensor summary cards strictly using values provided by the backend: Belt Speed, Belt Load, and station modality quality/anomaly status from latest pass events. No fake sensor values are synthesized.

---

## 4. Missing System Health & Edge Sync Telemetry (`/api/v1/system/health`)

- **PRD Reference**: Section 7.0 (GL-06: Connected/Degraded/Offline), Section 7.1 (OV-01: System uptime), Section 7.13 (SY-01, SY-02: Edge sync state)
- **Current Behavior**:
  - Backend provides root endpoint `GET /` with basic metadata:
    `{"platform": "NEXVION", "environment": "development", "provenance": "SIMULATED", ...}`.
  - No system uptime, edge queue depth, time sync offset, or individual camera/hardware health is exposed.
- **Desired Endpoint/Message**:
  - `GET /api/v1/system/health`
    ```json
    {
      "status": "HEALTHY",
      "uptime_seconds": 142850,
      "edge_sync": {
        "status": "SYNCED",
        "queue_depth": 0,
        "last_sync_ts": "2026-09-22T01:00:00.000Z",
        "buffer_remaining_hours": 72.0
      },
      "subsystems": {
        "rgb_camera": "ONLINE",
        "thermal_camera": "ONLINE",
        "laser_profiler": "ONLINE",
        "accelerometer": "ONLINE",
        "plc_bridge": "ONLINE"
      },
      "provenance": "SIMULATED"
    }
    ```
- **Frontend Mitigation**:
  - System status is determined dynamically from the live WebSocket connection state (`Connected` / `Degraded` if no message for >10s / `Offline`).
  - Uptime in status cards displays "Active (Live Stream)" or "Not available in this build" without inventing seconds counters.

---

## 5. Media & Image Evidence References in Alerts

- **PRD Reference**: Section 6.7 (Explainability: crop/heatmap, prior passes), Section 7.6 (AL-03: Detail evidence)
- **Current Behavior**:
  - `Alert.evidence_json` stores:
    ```json
    {
      "contributors": { "vision": {...}, "vibration": {...}, ... },
      "abnormal_modalities": ["vision", "vibration", "laser"],
      "is_corroborated": true
    }
    ```
  - Detections with bounding boxes are stored in the `detections` table, and inspections are in the PRD data model, but media URIs, snapshot crops, and heatmap image URLs are not linked in the alert evidence payload.
- **Desired Payload Addition**:
  - Inside `Alert.evidence_json`:
    ```json
    {
      "image_crops": [
        {
          "modality": "vision",
          "uri": "/api/v1/inspections/media/img_123.jpg",
          "bbox": [120, 85, 300, 150],
          "defect_class": "splice_lift",
          "confidence": 0.88
        }
      ]
    }
    ```
- **Frontend Mitigation**:
  - The AI Insight card and joint drawer render deterministic textual and metric breakdowns from the available `contributors` and `abnormal_modalities` data.
  - Image preview areas cleanly indicate "Inspection image capture not linked in current feed".
