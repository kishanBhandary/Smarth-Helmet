import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

# Compatibility shim for scikit-learn unpickling of ColumnTransformer
try:
    import sklearn.compose._column_transformer as ct
    if not hasattr(ct, "_RemainderColsList"):
        class _RemainderColsList(list):
            pass
        ct._RemainderColsList = _RemainderColsList
except Exception as e:
    logging.warning(f"Failed to patch _RemainderColsList: {e}")

from app.schemas import (
    BatchPredictionRecordResult,
    BatchPredictionResponse,
    SensorFeatureInput,
    SinglePredictionResponse,
)

logger = logging.getLogger("ml-service.predictor")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"
ACCIDENT_MODEL_PATH = MODEL_DIR / "final_accident_prediction_model.pkl"
SEVERITY_MODEL_PATH = MODEL_DIR / "final_severity_prediction_model.pkl"
SEVERITY_PREPROCESSOR_PATH = MODEL_DIR / "severity_preprocessor.pkl"
SEVERITY_LABEL_ENCODER_PATH = MODEL_DIR / "severity_label_encoder.pkl"
MODEL_METADATA_PATH = MODEL_DIR / "model_metadata.json"


class ModelPredictor:
    _instance: Optional["ModelPredictor"] = None

    def __init__(self):
        self.accident_model = None
        self.severity_model = None
        self.severity_preprocessor = None
        self.severity_encoder = None
        self.metadata = {}
        self.model_version = "v1.0"
        self.is_loaded = False

    @classmethod
    def get_instance(cls) -> "ModelPredictor":
        if cls._instance is None:
            cls._instance = ModelPredictor()
        return cls._instance

    def load_models(self):
        """Loads all ML models and preprocessors once into memory."""
        logger.info(f"Loading models from {MODEL_DIR}...")
        
        missing_files = []
        for p, label in [
            (ACCIDENT_MODEL_PATH, "accident model"),
            (SEVERITY_MODEL_PATH, "severity model"),
            (SEVERITY_PREPROCESSOR_PATH, "severity preprocessor"),
            (SEVERITY_LABEL_ENCODER_PATH, "severity label encoder"),
        ]:
            if not p.exists():
                missing_files.append(f"{label} ({p.name})")

        if missing_files:
            raise FileNotFoundError(
                f"Missing required model files in {MODEL_DIR}: {', '.join(missing_files)}"
            )

        try:
            self.accident_model = joblib.load(ACCIDENT_MODEL_PATH)
            logger.info("Loaded accident prediction model successfully.")

            self.severity_model = joblib.load(SEVERITY_MODEL_PATH)
            logger.info("Loaded severity prediction model successfully.")

            self.severity_preprocessor = joblib.load(SEVERITY_PREPROCESSOR_PATH)
            logger.info("Loaded severity preprocessor successfully.")

            self.severity_encoder = joblib.load(SEVERITY_LABEL_ENCODER_PATH)
            logger.info("Loaded severity label encoder successfully.")

            if MODEL_METADATA_PATH.exists():
                with open(MODEL_METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
                    self.model_version = self.metadata.get("metadata_version", "v1.0")

            self.is_loaded = True
            logger.info("All ML models and artifacts successfully initialized.")
        except Exception as e:
            logger.error(f"Failed to load models: {e}", exc_info=True)
            self.is_loaded = False
            raise RuntimeError(f"Failed to load ML models: {e}")

    def predict_single(self, record: SensorFeatureInput) -> SinglePredictionResponse:
        if not self.is_loaded:
            raise RuntimeError("Models are not loaded.")

        features = record.to_model_features()
        df = pd.DataFrame([features])

        # Step 1: Accident prediction & probability
        pred_acc = int(self.accident_model.predict(df)[0])
        acc_probs = self.accident_model.predict_proba(df)[0]
        acc_prob = float(acc_probs[1] * 100)

        # Step 2: Severity prediction (only if accident is predicted)
        severity = "None"
        if pred_acc == 1:
            X_sev = self.severity_preprocessor.transform(df)
            sev_idx = self.severity_model.predict(X_sev)[0]
            sev_label = self.severity_encoder.inverse_transform([sev_idx])[0]
            severity = str(sev_label)

        return SinglePredictionResponse(
            success=True,
            accident="Yes" if pred_acc == 1 else "No",
            accident_probability=round(acc_prob, 2),
            severity=severity,
            model_version=self.model_version,
            features_used=features,
        )

    def predict_batch(self, records: List[SensorFeatureInput]) -> BatchPredictionResponse:
        if not self.is_loaded:
            raise RuntimeError("Models are not loaded.")

        if not records:
            return BatchPredictionResponse(
                success=True,
                total=0,
                predicted_accidents=0,
                predicted_no_accidents=0,
                model_version=self.model_version,
                predictions=[],
            )

        features_list = [r.to_model_features() for r in records]
        df = pd.DataFrame(features_list)

        # Batch accident prediction
        preds_acc = self.accident_model.predict(df)
        probs_acc = self.accident_model.predict_proba(df)

        # Identify rows where accident was predicted (pred == 1)
        accident_indices = np.where(preds_acc == 1)[0]
        severities = ["None"] * len(records)

        if len(accident_indices) > 0:
            df_accidents = df.iloc[accident_indices]
            X_sev = self.severity_preprocessor.transform(df_accidents)
            sev_preds = self.severity_model.predict(X_sev)
            sev_labels = self.severity_encoder.inverse_transform(sev_preds)

            for idx, label in zip(accident_indices, sev_labels):
                severities[idx] = str(label)

        results: List[BatchPredictionRecordResult] = []
        total_accidents = 0
        total_no_accidents = 0

        for i, r in enumerate(records):
            is_acc = int(preds_acc[i]) == 1
            prob = float(probs_acc[i][1] * 100)
            if is_acc:
                total_accidents += 1
            else:
                total_no_accidents += 1

            results.append(
                BatchPredictionRecordResult(
                    id=r.id,
                    success=True,
                    accident="Yes" if is_acc else "No",
                    accident_probability=round(prob, 2),
                    severity=severities[i],
                )
            )

        return BatchPredictionResponse(
            success=True,
            total=len(records),
            predicted_accidents=total_accidents,
            predicted_no_accidents=total_no_accidents,
            model_version=self.model_version,
            predictions=results,
        )


predictor = ModelPredictor.get_instance()

