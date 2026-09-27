import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.seeds.seed_data import init_and_seed
from backend.app.simulator.engine import SimulatorEngine
from backend.app.routers.websocket import router as ws_router, ws_manager
from backend.app.routers.assets import router as assets_router
from backend.app.routers.sim import router as sim_router, set_simulator
from backend.app.models.enums import Provenance

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexvion.main")

simulator: SimulatorEngine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global simulator
    logger.info("Initializing NEXVION Backend...")

    # 1. Initialize schema and seed data
    init_and_seed()

    # 2. Instantiate Simulator Engine with live WebSocket broadcast callback
    simulator = SimulatorEngine(
        conveyor_id="CV-01",
        default_preset=settings.SIM_SPEED_PRESET,
        seed=settings.SIM_RANDOM_SEED,
        broadcast_callback=ws_manager.broadcast,
    )
    set_simulator(simulator)

    # 3. Start simulation engine
    await simulator.start()
    logger.info("BeltScanX AI Simulator active and broadcasting at /ws/live")

    yield

    # Teardown
    if simulator:
        await simulator.stop()
    logger.info("BeltScanX AI Backend shut down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Conveyor Belt Joint Health & Predictive Maintenance Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(ws_router)
app.include_router(assets_router)
app.include_router(sim_router)


@app.get("/")
@app.get("/api/v1/info")
def root_info():
    """Root platform health endpoint."""
    return {
        "platform": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "provenance": Provenance.SIMULATED.value,
        "websocket_endpoint": "/ws/live",
        "demo_banner_required": True,
        "advisory_only_notice": "Advisory only. BeltScanX AI never starts or stops physical machinery.",
    }
