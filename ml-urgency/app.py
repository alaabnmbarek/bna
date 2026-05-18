import os
import pickle
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)


class PredictResponse(BaseModel):
    urgent: bool
    probability: Optional[float] = None
    level: str
    model: str


def _load_pickle(path: str):
    try:
        import joblib

        return joblib.load(path)
    except Exception:
        with open(path, "rb") as f:
            return pickle.load(f)


def _truthy_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _resolve_artifact_path(configured_path: str, fallback_name: str) -> str:
    candidates: list[Path] = []

    if configured_path:
        candidates.append(Path(configured_path))

    here = Path(__file__).resolve().parent
    candidates.append(here / "ml-models" / fallback_name)

    for folder in (Path("/models"), here / "ml-models"):
        try:
            if folder.exists() and folder.is_dir():
                if fallback_name:
                    candidates.append(folder / fallback_name)
        except Exception:
            pass

    for p in candidates:
        try:
            if p.exists() and p.is_file():
                return str(p)
        except Exception:
            continue

    return configured_path


def _resolve_model_path(configured_path: str) -> str:
    candidates: list[Path] = []

    if configured_path:
        candidates.append(Path(configured_path))

    here = Path(__file__).resolve().parent
    candidates.append(here / "ml-models" / "logistic_regression.pkl")
    candidates.append(here / "ml-models" / "random_forest.pkl")

    for folder in (Path("/models"), here / "ml-models"):
        try:
            if folder.exists() and folder.is_dir():
                candidates.extend(sorted(folder.glob("*.pkl")))
        except Exception:
            pass

    for p in candidates:
        try:
            if p.exists() and p.is_file():
                return str(p)
        except Exception:
            continue

    return configured_path


MODEL_PATH = os.getenv("MODEL_PATH", "/models/logistic_regression.pkl")
SCALER_PATH = os.getenv("SCALER_PATH", "/models/scaler.pkl")
FEATURE_COLUMNS_PATH = os.getenv("FEATURE_COLUMNS_PATH", "/models/feature_columns.pkl")
STRICT_ARTIFACTS = _truthy_env("STRICT_ARTIFACTS", False)

app = FastAPI(title="Urgency Predictor", version="1.0.0")

model = None
scaler = None
feature_columns = None
model_error = None
resolved_paths: Dict[str, Optional[str]] = {"model": None, "scaler": None, "feature_columns": None}

try:
    resolved_paths["model"] = _resolve_model_path(MODEL_PATH)
    model = _load_pickle(resolved_paths["model"])

    resolved_paths["feature_columns"] = _resolve_artifact_path(FEATURE_COLUMNS_PATH, "feature_columns.pkl")
    try:
        feature_columns = _load_pickle(resolved_paths["feature_columns"])
    except Exception:
        feature_columns = None

    resolved_paths["scaler"] = _resolve_artifact_path(SCALER_PATH, "scaler.pkl")
    try:
        scaler = _load_pickle(resolved_paths["scaler"])
    except Exception:
        scaler = None

    if STRICT_ARTIFACTS and (feature_columns is None or scaler is None):
        missing = []
        if feature_columns is None:
            missing.append("feature_columns")
        if scaler is None:
            missing.append("scaler")
        raise RuntimeError(f"Missing artifacts: {', '.join(missing)}")
except Exception as e:
    model = None
    model_error = str(e)


@app.get("/health")
def health():
    fc_len = None
    try:
        if feature_columns is not None:
            fc_len = len(list(feature_columns))
    except Exception:
        fc_len = None

    return {
        "ok": model is not None,
        "artifacts": {
            "model": {"loaded": model is not None, "path": resolved_paths["model"] or MODEL_PATH},
            "scaler": {"loaded": scaler is not None, "path": resolved_paths["scaler"] or SCALER_PATH},
            "feature_columns": {
                "loaded": feature_columns is not None,
                "path": resolved_paths["feature_columns"] or FEATURE_COLUMNS_PATH,
                "count": fc_len,
            },
        },
        "strictArtifacts": STRICT_ARTIFACTS,
        "error": model_error,
    }


def _compute_level(probability: float) -> str:
    if probability < 0.4:
        return "NON URGENT"
    if probability < 0.7:
        return "MOYEN"
    return "URGENT"


def _as_feature_list(obj: Any) -> Optional[list[str]]:
    if obj is None:
        return None
    if isinstance(obj, list):
        return [str(x) for x in obj]
    if isinstance(obj, tuple):
        return [str(x) for x in obj]
    try:
        return [str(x) for x in list(obj)]
    except Exception:
        return None


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail=f"Model not loaded: {model_error}")

    features = dict(req.features or {})
    if "nb_relance" not in features and "nb_relances" in features:
        features["nb_relance"] = features.get("nb_relances")
    if "nb_relances" not in features and "nb_relance" in features:
        features["nb_relances"] = features.get("nb_relance")

    cols = _as_feature_list(feature_columns)
    if cols is None:
        expected = getattr(model, "feature_names_in_", None)
        if expected is None and hasattr(model, "named_steps"):
            for _, step in getattr(model, "named_steps", {}).items():
                expected = getattr(step, "feature_names_in_", None)
                if expected is not None:
                    break
        if expected is not None:
            cols = [str(c) for c in list(expected)]

    if cols is None:
        cols = sorted({str(k) for k in features.keys()})

    df = pd.DataFrame([features]).reindex(columns=cols, fill_value=0)
    df = df.apply(pd.to_numeric, errors="coerce").fillna(0.0)

    try:
        X: Any
        if scaler is not None and hasattr(scaler, "transform"):
            X = scaler.transform(df.values)
        else:
            X = df.values

        if not hasattr(model, "predict_proba"):
            raise HTTPException(status_code=400, detail="Model does not support predict_proba()")

        proba = model.predict_proba(X)
        classes = getattr(model, "classes_", None)
        positive_index = None
        if classes is not None:
            clist = list(classes)
            for candidate in (1, True, "1", "URGENT", "urgent"):
                if candidate in clist:
                    positive_index = clist.index(candidate)
                    break
        if hasattr(proba, "shape") and proba.shape[1] >= 2:
            idx = positive_index if positive_index is not None else 1
            probability = float(proba[0][idx])
        else:
            probability = float(proba[0][0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {e}") from e

    if probability is None:
        raise HTTPException(status_code=400, detail="Prediction failed: probability is missing")

    level = _compute_level(probability)
    return PredictResponse(urgent=level == "URGENT", probability=probability, level=level, model=type(model).__name__)


@app.get("/")
def root():
    return {"ok": True}

# ==============================================================================
# MAIN
# ==============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
