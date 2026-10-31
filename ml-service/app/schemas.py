from typing import Optional, Union, List, Any, Dict
from pydantic import BaseModel, Field, field_validator


def normalize_yes_no(value: Any) -> str:
    if value is None:
        return "No"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    s = str(value).strip().lower()
    if s in ["yes", "true", "1", "harsh", "y", "sharp"]:
        return "Yes"
    return "No"


def normalize_weather(value: Any) -> str:
    if not value:
        return "Clear"
    s = str(value).strip().title()
    allowed = {"Clear", "Cloudy", "Fog", "Rain"}
    if s in allowed:
        return s
    # Fallback to closest match
    if "rain" in s.lower() or "storm" in s.lower():
        return "Rain"
    if "fog" in s.lower() or "mist" in s.lower():
        return "Fog"
    if "cloud" in s.lower():
        return "Cloudy"
    return "Clear"


def normalize_road_condition(value: Any) -> str:
    if not value:
        return "Normal"
    s = str(value).strip().title()
    allowed = {"Dry", "Normal", "Poor", "Pothole", "Wet"}
    if s in allowed:
        return s
    if "wet" in s.lower() or "water" in s.lower() or "slip" in s.lower():
        return "Wet"
    if "pothole" in s.lower() or "bump" in s.lower():
        return "Pothole"
    if "poor" in s.lower() or "rough" in s.lower() or "bad" in s.lower():
        return "Poor"
    if "dry" in s.lower():
        return "Dry"
    return "Normal"


class SensorFeatureInput(BaseModel):
    id: Optional[Union[str, int]] = None
    Speed: Optional[float] = None
    speed: Optional[float] = None
    Acceleration: Optional[float] = None
    acceleration: Optional[float] = None
    Braking: Optional[Union[str, bool]] = None
    braking: Optional[Union[str, bool]] = None
    Sharp_Turn: Optional[Union[str, bool]] = None
    sharp_turn: Optional[Union[str, bool]] = None
    sharpTurn: Optional[Union[str, bool]] = None
    Tilt_Angle: Optional[float] = None
    tilt_angle: Optional[float] = None
    tiltAngle: Optional[float] = None
    Weather: Optional[str] = None
    weather: Optional[str] = None
    Road_Condition: Optional[str] = None
    road_condition: Optional[str] = None
    roadCondition: Optional[str] = None

    # Preserved metadata fields
    company_id: Optional[str] = None
    rider_id: Optional[str] = None
    helmet_id: Optional[str] = None
    trip_id: Optional[str] = None
    timestamp: Optional[Any] = None
    gps: Optional[str] = None
    location: Optional[str] = None
    impact: Optional[float] = None

    def to_model_features(self) -> Dict[str, Any]:
        spd = self.Speed if self.Speed is not None else (self.speed if self.speed is not None else 0.0)
        acc = self.Acceleration if self.Acceleration is not None else (self.acceleration if self.acceleration is not None else 0.0)
        brk_raw = self.Braking if self.Braking is not None else self.braking
        st_raw = self.Sharp_Turn if self.Sharp_Turn is not None else (self.sharp_turn if self.sharp_turn is not None else self.sharpTurn)
        tilt = self.Tilt_Angle if self.Tilt_Angle is not None else (self.tilt_angle if self.tilt_angle is not None else (self.tiltAngle if self.tiltAngle is not None else 0.0))
        wth_raw = self.Weather if self.Weather is not None else self.weather
        rc_raw = self.Road_Condition if self.Road_Condition is not None else (self.road_condition if self.road_condition is not None else self.roadCondition)

        return {
            "Speed": float(spd),
            "Acceleration": float(acc),
            "Braking": normalize_yes_no(brk_raw),
            "Sharp_Turn": normalize_yes_no(st_raw),
            "Tilt_Angle": float(tilt),
            "Weather": normalize_weather(wth_raw),
            "Road_Condition": normalize_road_condition(rc_raw)
        }


class SinglePredictionResponse(BaseModel):
    success: bool
    accident: str  # "Yes" or "No"
    accident_probability: float  # e.g. 78.25
    severity: str  # "Critical", "High", "Medium", "Low", or "None"
    model_version: Optional[str] = "v1.0"
    features_used: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BatchPredictionRecordResult(BaseModel):
    id: Optional[Union[str, int]] = None
    success: bool
    accident: str
    accident_probability: float
    severity: str
    error: Optional[str] = None


class BatchPredictionRequest(BaseModel):
    records: List[SensorFeatureInput]


class BatchPredictionResponse(BaseModel):
    success: bool
    total: int
    predicted_accidents: int
    predicted_no_accidents: int
    model_version: str
    predictions: List[BatchPredictionRecordResult]


class HealthResponse(BaseModel):
    status: str
    accident_model_loaded: bool
    severity_model_loaded: bool
    severity_preprocessor_loaded: bool
    severity_label_encoder_loaded: bool
    model_metadata: Dict[str, Any]

