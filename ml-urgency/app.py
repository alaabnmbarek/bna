import os
import pickle
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)


class PredictResponse(BaseModel):
    urgent: bool
    probability: Optional[float] = None
    threshold: float
    model: str


def _load_model(path: str):
    try:
        import joblib

        return joblib.load(path)
    except Exception:
        with open(path, "rb") as f:
            return pickle.load(f)


MODEL_PATH = os.getenv("MODEL_PATH", "/models/random_forest.pkl")
THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))

app = FastAPI(title="Urgency Predictor", version="1.0.0")

model = None
model_error = None


@app.on_event("startup")
def startup() -> None:
    global model, model_error
    try:
        model = _load_model(MODEL_PATH)
        model_error = None
    except Exception as e:
        model = None
        model_error = str(e)


@app.get("/health")
def health():
    return {"ok": model is not None, "modelPath": MODEL_PATH, "error": model_error}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {model_error}")

    features = dict(req.features or {})
    df = pd.DataFrame([features])

    probability = None
    urgent = False

    try:
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(df)
            if hasattr(proba, "shape") and proba.shape[1] >= 2:
                probability = float(proba[0][1])
            else:
                probability = float(proba[0][0])
            urgent = probability >= THRESHOLD
        else:
            pred = model.predict(df)
            urgent = bool(int(pred[0]) == 1) if pred is not None else False
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}")

    return PredictResponse(
        urgent=urgent,
        probability=probability,
        threshold=THRESHOLD,
        model=type(model).__name__,
    )
