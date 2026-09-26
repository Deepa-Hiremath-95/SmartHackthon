import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "BeltScanX AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database connection URL
    DATABASE_URL: str = "sqlite:///./nexvion.db"

    # Simulation Defaults
    SIM_SPEED_PRESET: str = "600x"
    SIM_TIME_ACCELERATION: float = 600.0
    SIM_RANDOM_SEED: int = 42
    SIM_HOLD_CRITICAL_LAPS: int = 15
    SIM_AUTO_LOOP: bool = False
    SIM_MAX_STORED_EVENTS: int = 1000

    # API & WebSocket
    API_V1_PREFIX: str = "/api/v1"
    WS_PATH: str = "/ws/live"
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
if settings.PROJECT_NAME == "NEXVION":
    settings.PROJECT_NAME = "BeltScanX AI"
