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
    study_hours_per_day: float,
    sleep_hours: float,
    phone_usage_hours: float,
    social_media_hours: float,
    youtube_hours: float,
    gaming_hours: float,
    breaks_per_day: int,
    coffee_intake_mg: float,
    exercise_minutes: float,
    assignments_completed: int,
    attendance_percentage: float,
    stress_level: int,
):
    """Predict productivity score based on user inputs"""
    try:
        prediction = ml_models.predict_productivity(
            age,
            gender,
            study_hours_per_day,
            sleep_hours,
            phone_usage_hours,
            social_media_hours,
            youtube_hours,
            gaming_hours,
            breaks_per_day,
            coffee_intake_mg,
            exercise_minutes,
            assignments_completed,
            attendance_percentage,
            stress_level,
        )
        return {"predicted_productivity": float(prediction)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ml/predict/stress")
def predict_stress(
    age: int,
    gender: str,
    study_hours_per_day: float,
    sleep_hours: float,
    phone_usage_hours: float,
    social_media_hours: float,
    youtube_hours: float,
    gaming_hours: float,
    breaks_per_day: int,
    coffee_intake_mg: float,
    exercise_minutes: float,
    assignments_completed: int,
    attendance_percentage: float,
    productivity_score: float,
):
    """Predict stress level based on user inputs"""
    try:
        prediction = ml_models.predict_stress(
            age,
            gender,
            study_hours_per_day,
            sleep_hours,
            phone_usage_hours,
            social_media_hours,
            youtube_hours,
            gaming_hours,
            breaks_per_day,
            coffee_intake_mg,
            exercise_minutes,
            assignments_completed,
            attendance_percentage,
            productivity_score,
        )
        return {"predicted_stress_band": prediction}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/ml/model/performance")
def get_model_performance():
    """Get ML model performance metrics"""
    return ml_models.get_model_performance()

@app.get("/api/viz/distribution/{column}")
def get_distribution(column: str):
    """Get distribution data for a specific column"""
    try:
        data = viz.get_distribution_data(column)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/correlation")
def get_correlation_matrix():
    """Get correlation matrix data"""
    try:
        data = viz.get_correlation_matrix_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/scatter/{x_column}/{y_column}")
def get_scatter_plot(x_column: str, y_column: str):
    """Get scatter plot data between two columns"""
    try:
        data = viz.get_scatter_data(x_column, y_column)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/boxplot/{column}")
def get_boxplot(column: str):
    """Get boxplot data for a column"""
    try:
        data = viz.get_boxplot_data(column)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/occupation-analysis")
def get_occupation_analysis():
    """Get analysis data grouped by occupation (gender)"""
    try:
        data = viz.get_occupation_analysis_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/viz/device-comparison")
def get_device_comparison():
    """Get comparison data between stress bands"""
    try:
        data = viz.get_device_comparison_data()
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)