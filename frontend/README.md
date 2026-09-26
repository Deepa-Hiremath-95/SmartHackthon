# BeltScanX AI Frontend (React + TypeScript + Vite + Tailwind)

This is the web frontend shell and real-time Overview command center for the **BeltScanX AI** Conveyor Belt Joint Health & Predictive Maintenance Platform (SIH 2026, PS ID 26008).

---

## 1. Prerequisites
- **Node.js**: v18+ (verified on Node `v24.20.0` and npm `11.19.0`)
- **Backend**: FastAPI backend running at `http://127.0.0.1:8000`

---

## 2. Windows PowerShell Setup & Commands

Open Windows PowerShell in the project root:

### Step 1: Install Dependencies
```powershell
cd d:\SmartHackthon\frontend
npm install
```

### Step 2: Run Unit Tests
```powershell
npm test
```
Runs Vitest test suites covering:
- ISA-101 severity classification boundaries (Healthy $\ge$ 85, Watch 70–84, Maintenance 50–69, Critical $<$ 50, Offline).
- Colour + shape + label mappings.
- Live data state reducer, Conveyor Risk Index calculation ($0.6 \times \text{mean} + 0.4 \times \text{worst}$), WebSocket health update processing, memory history capping, and freshness tracking.

### Step 3: Run Production Build
```powershell
npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundling into `dist/`.

### Step 4: Run Development Server
```powershell
npm run dev
```
Starts the Vite development server at `http://localhost:5173`.
The Vite dev server is preconfigured to reverse-proxy:
- `/api/*` $\rightarrow$ `http://127.0.0.1:8000`
- `/ws/*` $\rightarrow$ `http://127.0.0.1:8000` (with WebSocket upgrade `ws: true`)

No backend CORS or routing modifications are required.

---

## 3. Running Backend & Frontend Together

In PowerShell Terminal 1 (Start Backend):
```powershell
cd d:\SmartHackthon
.venv\Scripts\uvicorn.exe backend.app.main:app --host 127.0.0.1 --port 8000
```

In PowerShell Terminal 2 (Start Frontend):
```powershell
cd d:\SmartHackthon\frontend
npm run dev
```

Open your browser to:
```
http://localhost:5173
```

---

## 4. Key Architectural Guarantees & Features

- **Advisory Only**: The frontend never dispatches machine control commands (emergency stops remain on hardwired SCADA/PLC).
- **Provenance Transparency**: Whenever data is simulated, a persistent purple **DEMO DATA** banner is visible.
- **Colour-Blind Safe**: Every severity level is expressed with **Colour + Shape + Label**:
  - Healthy ($\ge$ 85): Green circle (`●`)
  - Watch (70–84): Yellow triangle (`▲`)
  - Maintenance Required (50–69): Orange diamond (`◆`)
  - Critical ($<$ 50): Red octagon (`⯄`)
  - Offline / No Data: Grey hollow circle (`○`)
- **Prognostics Honesty**: Remaining Useful Life (RUL) always shows an explicit status badge (`UNAVAILABLE`, `DEMO`, `ESTIMATED`, `VALIDATED`), never an unvalidated bare number.
- **One-Click Demo Walkthrough**: The Demo Simulator panel includes a **"Run Demo"** button that resets the simulation to lap 0 and engages the `600x` acceleration preset.
- **Live Memory Health History**: The joint detail drawer records up to 100 actual WebSocket `health_update` points in memory — zero synthetic history.
- **Developer Mode**: Toggle via the Top Bar pill or URL parameter `?dev=1` to inspect documented backend API gaps (documented in `docs/BACKEND_GAPS.md`).
