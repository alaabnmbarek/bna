import os
import joblib
import logging
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# =============================================================================
# LOGGING
# =============================================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("urgency-api")

# =============================================================================
# LOAD MODEL
# =============================================================================
MODEL_PATH = "urgency_model.pkl"
FEATURES_PATH = "feature_columns.pkl"

model = joblib.load(MODEL_PATH)
feature_columns = joblib.load(FEATURES_PATH)

logger.info("Model loaded successfully")

# =============================================================================
# APP
# =============================================================================
app = FastAPI(title="Urgency Predictor", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# SCHEMAS
# =============================================================================
class PredictRequest(BaseModel):
    features: dict = Field(default_factory=dict)

class PredictResponse(BaseModel):
    urgent: bool
    probability: float
    level: str
    model: str

# =============================================================================
# UTILS
# =============================================================================
def compute_level(prob):
    if prob < 0.4:
        return "NON URGENT"
    elif prob < 0.7:
        return "MOYEN"
    return "URGENT"

# =============================================================================
# ROUTES
# =============================================================================
@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"model_loaded": model is not None}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):

    try:
        df = pd.DataFrame([req.features])

        #  FIX IMPORTANT: same training columns
        df = df.reindex(columns=feature_columns, fill_value=0)

        # prediction
        proba = model.predict_proba(df)[0]

        # IMPORTANT FIX: class index safe
        classes = model.named_steps["clf"].classes_
        urgent_index = list(classes).index(2)

        probability = float(proba[urgent_index])

        level = compute_level(probability)

        return PredictResponse(
            urgent=(level == "URGENT"),
            probability=probability,
            level=level,
            model="LogisticRegressionPipeline"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =============================================================================
# RUN
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)