from fastapi import APIRouter, HTTPException, Query
from backend.app.models.enums import Provenance

router = APIRouter(prefix="/api/v1/sim", tags=["Simulation Control"])

# Reference to active simulator instance will be set by app lifespan
simulator_instance = None


def set_simulator(sim):
    global simulator_instance
    simulator_instance = sim


@router.get("/status")
def get_simulation_status():
    """Returns current status of simulation engine."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    return {
        "run_id": simulator_instance.run_id,
        "lap": simulator_instance.current_lap,
        "current_lap": simulator_instance.current_lap,
        "speed_preset": simulator_instance.preset,
        "paused": simulator_instance.paused,
        "scenario_phase": simulator_instance.get_scenario_phase(),
        "running": simulator_instance.running,
        "conveyor_id": simulator_instance.conveyor_id,
        "time_acceleration": simulator_instance.time_acceleration,
        "belt_position_m": round(simulator_instance.current_belt_position_m, 2),
        "target_joint": simulator_instance.scenario.target_joint_code,
        "critical_laps_held": simulator_instance.critical_laps_held,
        "provenance": Provenance.SIMULATED.value,
    }


@router.post("/start")
async def start_simulation():
    """Starts the real-time simulation."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    await simulator_instance.start()
    return {"status": "started", "speed_preset": simulator_instance.preset}


@router.post("/stop")
async def stop_simulation():
    """Stops the simulation."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    await simulator_instance.stop()
    return {"status": "stopped"}


@router.post("/pause")
def pause_simulation():
    """Pauses the simulation."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    simulator_instance.pause()
    return {"status": "paused"}


@router.post("/resume")
def resume_simulation():
    """Resumes the simulation."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    simulator_instance.resume()
    return {"status": "resumed"}


@router.post("/reset")
def reset_simulation():
    """Resets the simulation to lap 0."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    simulator_instance.reset()
    return {"status": "reset", "current_lap": 0}


@router.post("/speed")
def set_simulation_speed(preset: str = Query(..., description="Preset: 1x, 10x, 60x, or 600x")):
    """Sets simulator speed preset."""
    if not simulator_instance:
        raise HTTPException(status_code=503, detail="Simulator not initialized")

    try:
        simulator_instance.set_speed_preset(preset)
        return {
            "status": "updated",
            "preset": preset,
            "time_acceleration": simulator_instance.time_acceleration,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
