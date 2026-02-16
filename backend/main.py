from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pandas as pd
import numpy as np
from typing import Optional, List
import os
import base64
from io import BytesIO

from .ml_models import MLModels
from .visualizations import Visualizations

app = FastAPI(title="Smartphone Usage Analytics API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models and visualizations
ml_models = MLModels()
viz = Visualizations()

@app.get("/")
def read_root():
    return {"message": "Smartphone Usage Analytics API", "version": "1.0.0"}

@app.get("/api/data/stats")
def get_data_stats():
    """Get basic statistics about the dataset"""
    return ml_models.get_data_stats()

@app.get("/api/data/sample")
def get_sample_data(limit: int = 100):
    """Get sample data from the dataset"""
    return ml_models.get_sample_data(limit)

@app.post("/api/ml/predict/productivity")
def predict_productivity(
    age: int,
    gender: str,
    occupation: str,
    device_type: str,
    daily_phone_hours: float,
    social_media_hours: float,
    sleep_hours: float,
    stress_level: int,
    app_usage_count: int,
    caffeine_intake: float,
    weekend_screen_time: float
):
    """Predict productivity score based on user inputs"""
    try:
        prediction = ml_models.predict_productivity(
            age, gender, occupation, device_type,
            daily_phone_hours, social_media_hours,
            sleep_hours, stress_level, app_usage_count,
            caffeine_intake, weekend_screen_time
        )
        return {"predicted_productivity": float(prediction)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ml/predict/stress")
def predict_stress(
    age: int,
    gender: str,
    occupation: str,
    device_type: str,
    daily_phone_hours: float,
    social_media_hours: float,
    sleep_hours: float,
    work_productivity_score: int,
    app_usage_count: int,
    caffeine_intake: float,
    weekend_screen_time: float
):
    """Predict stress level based on user inputs"""
    try:
        prediction = ml_models.predict_stress(
            age, gender, occupation, device_type,
            daily_phone_hours, social_media_hours,
            sleep_hours, work_productivity_score,
            app_usage_count, caffeine_intake, weekend_screen_time
        )
        return {"predicted_stress_level": int(prediction)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/ml/model/performance")
def get_model_performance():
    """Get ML model performance metrics"""
    return ml_models.get_model_performance()

@app.get("/api/viz/distribution/{column}")
def get_distribution(column: str):
    """Get distribution plot for a specific column"""
    try:
        img_base64 = viz.plot_distribution(column)
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/correlation")
def get_correlation_matrix():
    """Get correlation matrix heatmap"""
    try:
        img_base64 = viz.plot_correlation_matrix()
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/scatter/{x_column}/{y_column}")
def get_scatter_plot(x_column: str, y_column: str):
    """Get scatter plot between two columns"""
    try:
        img_base64 = viz.plot_scatter(x_column, y_column)
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/boxplot/{column}")
def get_boxplot(column: str):
    """Get boxplot for a column"""
    try:
        img_base64 = viz.plot_boxplot(column)
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/occupation-analysis")
def get_occupation_analysis():
    """Get analysis plots grouped by occupation"""
    try:
        img_base64 = viz.plot_occupation_analysis()
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/device-comparison")
def get_device_comparison():
    """Get comparison plots between Android and iOS"""
    try:
        img_base64 = viz.plot_device_comparison()
        return {"image": img_base64}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)