import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.predictor import predictor
from app.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
    SensorFeatureInput,
    SinglePredictionResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ml-service")

MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "10000"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ML models once
    logger.info("Initializing ML models during application startup...")
    try:
        predictor.load_models()
        logger.info("ML Service startup complete. Models ready for inference.")
    except Exception as e:
        logger.critical(f"Fatal error during model initialization: {e}", exc_info=True)
    yield
    # Shutdown
    logger.info("ML Service shutting down...")


app = FastAPI(
    title="Smart Helmet ML Service",
    description="Real-time and batch accident & severity prediction microservice",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local development and microservice communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Checks the health of the service and verification of loaded model artifacts."""
    loaded = predictor.is_loaded
    return HealthResponse(
        status="healthy" if loaded else "degraded",
        accident_model_loaded=predictor.accident_model is not None,
        severity_model_loaded=predictor.severity_model is not None,
        severity_preprocessor_loaded=predictor.severity_preprocessor is not None,
        severity_label_encoder_loaded=predictor.severity_encoder is not None,
        model_metadata=predictor.metadata,
    )


@app.post("/predict", response_model=SinglePredictionResponse)
async def predict_single(record: SensorFeatureInput):
    """
    Predict accident probability and severity for a single sensor record.
    Severity is only predicted when an accident is detected.
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML models are not loaded or failed to initialize.",
        )

    try:
        result = predictor.predict_single(record)
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}",
        )


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(request: BatchPredictionRequest):
    """
    Predict accident probability and severity for a batch of sensor records.
    Preserves record identifiers across the batch.
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML models are not loaded or failed to initialize.",
        )

    count = len(request.records)
    if count == 0:
        return BatchPredictionResponse(
            success=True,
            total=0,
            predicted_accidents=0,
            predicted_no_accidents=0,
            model_version=predictor.model_version,
            predictions=[],
        )

    if count > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size of {count} exceeds the maximum limit of {MAX_BATCH_SIZE}.",
        )

    try:
        response = predictor.predict_batch(request.records)
        return response
    except Exception as e:
        logger.error(f"Batch prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference execution failed: {str(e)}",
        )


@app.get("/")
async def root():
    return {
        "service": "Smart Helmet ML Inference Service",
        "status": "online",
        "version": predictor.model_version,
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "predict_batch": "/predict/batch",
        },
    }

