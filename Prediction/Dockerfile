FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
ENV PIP_DEFAULT_TIMEOUT=300
RUN pip install --no-cache-dir --retries 10 --timeout 300 -r /app/requirements.txt

COPY app.py /app/app.py

ENV MODEL_PATH=/models/legal_outcome_model.pkl
ENV FEATURE_COLUMNS_PATH=/models/feature_columns.pkl

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
