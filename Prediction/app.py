import os
import joblib
import logging
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("legal-outcome-api")

MODELS_DIR = os.getenv("MODELS_DIR", "/models")
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(MODELS_DIR, "xgb_model.pkl"))
FEATURE_COLUMNS_PATH = os.getenv("FEATURE_COLUMNS_PATH", os.path.join(MODELS_DIR, "feature_columns.pkl"))

model = None
feature_columns = None


def _resolve_first_existing(path: str, candidates: list[str]) -> str:
    if path and os.path.exists(path):
        return path
    for c in candidates:
        if os.path.exists(c):
            return c
    return path


def _find_first_by_prefix(prefix: str) -> str | None:
    if not os.path.isdir(MODELS_DIR):
        return None
    for name in sorted(os.listdir(MODELS_DIR)):
        if not name.lower().endswith(".pkl"):
            continue
        if name.lower().startswith(prefix.lower()):
            return os.path.join(MODELS_DIR, name)
    return None


MODEL_PATH = _resolve_first_existing(
    MODEL_PATH,
    [
        _find_first_by_prefix("xgb_model") or "",
        _find_first_by_prefix("model") or "",
    ],
)
FEATURE_COLUMNS_PATH = _resolve_first_existing(
    FEATURE_COLUMNS_PATH,
    [
        _find_first_by_prefix("feature_columns") or "",
        _find_first_by_prefix("features") or "",
    ],
)

try:
    model = joblib.load(MODEL_PATH)
    logger.info("Model loaded: %s", MODEL_PATH)
except Exception as e:
    logger.warning("Model not loaded (%s): %s", MODEL_PATH, e)

try:
    if os.path.exists(FEATURE_COLUMNS_PATH):
        feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
        if not isinstance(feature_columns, list):
            raise ValueError("feature_columns.pkl must be a list of column names")
        logger.info("Feature columns loaded: %s (%d columns)", FEATURE_COLUMNS_PATH, len(feature_columns))
except Exception as e:
    logger.warning("Feature columns not loaded (%s): %s", FEATURE_COLUMNS_PATH, e)
    feature_columns = None

app = FastAPI(title="Legal Outcome Predictor", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    specialite_avocat: str = Field(..., min_length=1, validation_alias=AliasChoices("specialite_avocat", "specialite"))
    experience_avocat: float = Field(..., ge=0, validation_alias=AliasChoices("experience_avocat", "experience"))
    presence_huissier: int = Field(..., validation_alias=AliasChoices("presence_huissier"))
    presence_expert: int = Field(..., validation_alias=AliasChoices("presence_expert"))
    nombre_audiences: int = Field(..., ge=0)
    type_affaire: str = Field(..., min_length=1)
    type_procedure: str = Field(..., min_length=1)
    nombre_reports: int = Field(..., ge=0)

    @field_validator("presence_huissier", "presence_expert", mode="before")
    @classmethod
    def _bool_to_int(cls, v):
        if isinstance(v, bool):
            return 1 if v else 0
        return v


class PredictResponse(BaseModel):
    prediction: str
    probability: float


def preprocess(raw: dict) -> pd.DataFrame:
    if feature_columns is None:
        raise RuntimeError("FEATURE_COLUMNS_NOT_LOADED")
    df = pd.DataFrame([raw])
    df = pd.get_dummies(df)
    df = df.reindex(columns=feature_columns, fill_value=0)
    return df


def _build_raw(req: PredictRequest) -> dict:
    raw = {
        "specialite_avocat": str(req.specialite_avocat).strip(),
        "experience_avocat": float(req.experience_avocat),
        "presence_huissier": int(req.presence_huissier),
        "presence_expert": int(req.presence_expert),
        "nombre_audiences": int(req.nombre_audiences),
        "type_affaire": str(req.type_affaire).strip(),
        "type_procedure": str(req.type_procedure).strip(),
        "nombre_reports": int(req.nombre_reports),
    }
    return raw


def predict_model(x: pd.DataFrame) -> tuple[str, float]:
    if model is None:
        raise RuntimeError("MODEL_NOT_LOADED")

    pred = model.predict(x)[0]

    proba = 0.0
    if hasattr(model, "predict_proba"):
        proba = float(model.predict_proba(x)[0][1])

    label = "GAIN" if int(pred) == 1 else "PERTE"
    return label, proba


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "features_loaded": feature_columns is not None,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        raw = _build_raw(req)
        x = preprocess(raw)
        prediction, probability = predict_model(x)
        return PredictResponse(prediction=prediction, probability=probability)
    except Exception as e:
        logger.error("Prediction error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
