import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
import os

class MLModels:
    def __init__(self):
        self.df = None
        self.productivity_model = None
        self.stress_model = None
        self.load_data()
        self.train_models()
    
    def load_data(self):
        """Load the dataset"""
        # Use the student productivity & distraction dataset as the single source of truth
        csv_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'student_productivity_distraction_dataset_20000.csv',
        )
        self.df = pd.read_csv(csv_path)
        
    def get_data_stats(self):
        """Get basic statistics about the dataset"""
        stats = {
            "total_records": len(self.df),
            "columns": list(self.df.columns),
            "numeric_stats": self.df.describe().to_dict(),
            "categorical_counts": {}
        }
        
        # Get counts for categorical columns (dataset-specific)
        categorical_cols = ['gender']
        for col in categorical_cols:
            if col in self.df.columns:
                stats["categorical_counts"][col] = self.df[col].value_counts().to_dict()
        
        return stats
    
    def get_sample_data(self, limit=100):
        """Get sample data"""
        return self.df.head(limit).to_dict(orient='records')
    
    def train_models(self):
        """Train ML models"""
        # Explicit feature sets so training and prediction always agree
        productivity_features = [
            'age',
            'study_hours_per_day',
            'sleep_hours',
            'phone_usage_hours',
            'social_media_hours',
            'youtube_hours',
            'gaming_hours',
            'breaks_per_day',
            'coffee_intake_mg',
            'exercise_minutes',
            'assignments_completed',
            'attendance_percentage',
            'stress_level',
        ]

        stress_features = [
            'age',
            'study_hours_per_day',
            'sleep_hours',
            'phone_usage_hours',
            'social_media_hours',
            'youtube_hours',
            'gaming_hours',
            'breaks_per_day',
            'coffee_intake_mg',
            'exercise_minutes',
            'assignments_completed',
            'attendance_percentage',
            'productivity_score',
        ]

        # ----- Productivity score model (Regression: RandomForestRegressor) -----
        y_productivity = self.df['productivity_score']
        X = self.df[productivity_features]
        X_train_prod, X_test_prod, y_train_prod, y_test_prod = train_test_split(
            X, y_productivity, test_size=0.2, random_state=42
        )

        self.productivity_model = RandomForestRegressor(
            n_estimators=200, random_state=42, n_jobs=-1
        )
        self.productivity_model.fit(X_train_prod, y_train_prod)

        # ----- Stress level model (Classification: RandomForestClassifier) -----
        # Bin numeric stress_level into 3 bands: low / medium / high
        if 'stress_level' not in self.df.columns:
            raise ValueError("Column 'stress_level' not found in dataset")
        bins = [0, 3, 7, 10]
        labels = ['low', 'medium', 'high']
        self.df['stress_band'] = pd.cut(
            self.df['stress_level'],
            bins=bins,
            labels=labels,
            include_lowest=True,
        )
        y_stress = self.df['stress_band']
        X_stress = self.df[stress_features]
        X_train_stress, X_test_stress, y_train_stress, y_test_stress = train_test_split(
            X_stress, y_stress, test_size=0.2, random_state=42, stratify=y_stress
        )

        self.stress_model = RandomForestClassifier(
            n_estimators=200, random_state=42, n_jobs=-1
        )
        self.stress_model.fit(X_train_stress, y_train_stress)

        # Store test sets for performance metrics
        self.X_test_prod = X_test_prod
        self.y_test_prod = y_test_prod
        self.X_test_stress = X_test_stress
        self.y_test_stress = y_test_stress
    
    def predict_productivity(
        self,
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
    ):
        """Predict productivity score"""
        if self.productivity_model is None:
            raise ValueError("Model not trained yet")
        
        # Create input dataframe
        input_data = pd.DataFrame(
            {
                'age': [age],
                'study_hours_per_day': [study_hours_per_day],
                'sleep_hours': [sleep_hours],
                'phone_usage_hours': [phone_usage_hours],
                'social_media_hours': [social_media_hours],
                'youtube_hours': [youtube_hours],
                'gaming_hours': [gaming_hours],
                'breaks_per_day': [breaks_per_day],
                'coffee_intake_mg': [coffee_intake_mg],
                'exercise_minutes': [exercise_minutes],
                'assignments_completed': [assignments_completed],
                'attendance_percentage': [attendance_percentage],
                'stress_level': [stress_level],
            }
        )
        
        # Use the same feature ordering as in training
        feature_cols = [
            'age',
            'study_hours_per_day',
            'sleep_hours',
            'phone_usage_hours',
            'social_media_hours',
            'youtube_hours',
            'gaming_hours',
            'breaks_per_day',
            'coffee_intake_mg',
            'exercise_minutes',
            'assignments_completed',
            'attendance_percentage',
            'stress_level',
        ]
        X_input = input_data[feature_cols]
        
        # Predict
        prediction = self.productivity_model.predict(X_input)[0]
        # Productivity score is naturally continuous; return as-is but rounded
        return float(round(prediction, 2))
    
    def predict_stress(
        self,
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
    ):
        """Predict stress level"""
        if self.stress_model is None:
            raise ValueError("Model not trained yet")
        
        # Create input dataframe
        input_data = pd.DataFrame(
            {
                'age': [age],
                'study_hours_per_day': [study_hours_per_day],
                'sleep_hours': [sleep_hours],
                'phone_usage_hours': [phone_usage_hours],
                'social_media_hours': [social_media_hours],
                'youtube_hours': [youtube_hours],
                'gaming_hours': [gaming_hours],
                'breaks_per_day': [breaks_per_day],
                'coffee_intake_mg': [coffee_intake_mg],
                'exercise_minutes': [exercise_minutes],
                'assignments_completed': [assignments_completed],
                'attendance_percentage': [attendance_percentage],
                'productivity_score': [productivity_score],
            }
        )
        
        feature_cols = [
            'age',
            'study_hours_per_day',
            'sleep_hours',
            'phone_usage_hours',
            'social_media_hours',
            'youtube_hours',
            'gaming_hours',
            'breaks_per_day',
            'coffee_intake_mg',
            'exercise_minutes',
            'assignments_completed',
            'attendance_percentage',
            'productivity_score',
        ]
        X_input = input_data[feature_cols]
        
        # Predict
        prediction = self.stress_model.predict(X_input)[0]
        return str(prediction)
    
    def get_model_performance(self):
        """Get model performance metrics"""
        if self.productivity_model is None or self.stress_model is None:
            return {"error": "Models not trained yet"}
        
        # Productivity model metrics
        y_pred_prod = self.productivity_model.predict(self.X_test_prod)
        prod_mse = mean_squared_error(self.y_test_prod, y_pred_prod)
        prod_r2 = r2_score(self.y_test_prod, y_pred_prod)

        return {
            "productivity_model": {
                "type": "Productivity score (RandomForestRegressor, regression)",
                "mse": float(prod_mse),
                "r2_score": float(prod_r2),
                "rmse": float(np.sqrt(prod_mse)),
            },
            "stress_model": {
                "type": "Stress band (RandomForestClassifier, 3-class: low/medium/high)",
                "accuracy": float(
                    accuracy_score(
                        self.y_test_stress,
                        self.stress_model.predict(self.X_test_stress),
                    )
                ),
            },
        }