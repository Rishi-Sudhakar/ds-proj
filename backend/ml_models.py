import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import os

class MLModels:
    def __init__(self):
        self.df = None
        self.productivity_model = None
        self.stress_model = None
        self.label_encoders = {}
        self.load_data()
        self.train_models()
    
    def load_data(self):
        """Load the dataset"""
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'Smartphone_Usage_Productivity_Dataset_50000.csv')
        self.df = pd.read_csv(csv_path)
        
    def get_data_stats(self):
        """Get basic statistics about the dataset"""
        stats = {
            "total_records": len(self.df),
            "columns": list(self.df.columns),
            "numeric_stats": self.df.describe().to_dict(),
            "categorical_counts": {}
        }
        
        # Get counts for categorical columns
        categorical_cols = ['Gender', 'Occupation', 'Device_Type']
        for col in categorical_cols:
            if col in self.df.columns:
                stats["categorical_counts"][col] = self.df[col].value_counts().to_dict()
        
        return stats
    
    def get_sample_data(self, limit=100):
        """Get sample data"""
        return self.df.head(limit).to_dict(orient='records')
    
    def prepare_features(self, df):
        """Prepare features for ML models"""
        df_processed = df.copy()
        
        # Encode categorical variables
        categorical_cols = ['Gender', 'Occupation', 'Device_Type']
        for col in categorical_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                self.label_encoders[col].fit(self.df[col].unique())
            
            df_processed[col] = self.label_encoders[col].transform(df_processed[col])
        
        # Select features (excluding User_ID and target variables)
        feature_cols = [
            'Age', 'Gender', 'Occupation', 'Device_Type',
            'Daily_Phone_Hours', 'Social_Media_Hours', 'Sleep_Hours',
            'App_Usage_Count', 'Caffeine_Intake_Cups', 'Weekend_Screen_Time_Hours'
        ]
        
        return df_processed[feature_cols]
    
    def train_models(self):
        """Train ML models"""
        # Prepare features
        X = self.prepare_features(self.df)
        
        # Train Productivity Prediction Model (Regression)
        y_productivity = self.df['Work_Productivity_Score']
        X_train_prod, X_test_prod, y_train_prod, y_test_prod = train_test_split(
            X, y_productivity, test_size=0.2, random_state=42
        )
        
        self.productivity_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.productivity_model.fit(X_train_prod, y_train_prod)
        
        # Train Stress Level Prediction Model (Classification)
        y_stress = self.df['Stress_Level']
        X_train_stress, X_test_stress, y_train_stress, y_test_stress = train_test_split(
            X, y_stress, test_size=0.2, random_state=42
        )
        
        self.stress_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        self.stress_model.fit(X_train_stress, y_train_stress)
        
        # Store test sets for performance metrics
        self.X_test_prod = X_test_prod
        self.y_test_prod = y_test_prod
        self.X_test_stress = X_test_stress
        self.y_test_stress = y_test_stress
    
    def predict_productivity(self, age, gender, occupation, device_type,
                           daily_phone_hours, social_media_hours,
                           sleep_hours, stress_level, app_usage_count,
                           caffeine_intake, weekend_screen_time):
        """Predict productivity score"""
        if self.productivity_model is None:
            raise ValueError("Model not trained yet")
        
        # Create input dataframe
        input_data = pd.DataFrame({
            'Age': [age],
            'Gender': [gender],
            'Occupation': [occupation],
            'Device_Type': [device_type],
            'Daily_Phone_Hours': [daily_phone_hours],
            'Social_Media_Hours': [social_media_hours],
            'Sleep_Hours': [sleep_hours],
            'App_Usage_Count': [app_usage_count],
            'Caffeine_Intake_Cups': [caffeine_intake],
            'Weekend_Screen_Time_Hours': [weekend_screen_time]
        })
        
        # Prepare features
        X_input = self.prepare_features(input_data)
        
        # Predict
        prediction = self.productivity_model.predict(X_input)[0]
        return max(1, min(10, round(prediction, 2)))  # Clamp between 1-10
    
    def predict_stress(self, age, gender, occupation, device_type,
                      daily_phone_hours, social_media_hours,
                      sleep_hours, work_productivity_score, app_usage_count,
                      caffeine_intake, weekend_screen_time):
        """Predict stress level"""
        if self.stress_model is None:
            raise ValueError("Model not trained yet")
        
        # Create input dataframe
        input_data = pd.DataFrame({
            'Age': [age],
            'Gender': [gender],
            'Occupation': [occupation],
            'Device_Type': [device_type],
            'Daily_Phone_Hours': [daily_phone_hours],
            'Social_Media_Hours': [social_media_hours],
            'Sleep_Hours': [sleep_hours],
            'App_Usage_Count': [app_usage_count],
            'Caffeine_Intake_Cups': [caffeine_intake],
            'Weekend_Screen_Time_Hours': [weekend_screen_time]
        })
        
        # Prepare features
        X_input = self.prepare_features(input_data)
        
        # Predict
        prediction = self.stress_model.predict(X_input)[0]
        return int(max(1, min(10, prediction)))  # Clamp between 1-10
    
    def get_model_performance(self):
        """Get model performance metrics"""
        if self.productivity_model is None or self.stress_model is None:
            return {"error": "Models not trained yet"}
        
        # Productivity model metrics
        y_pred_prod = self.productivity_model.predict(self.X_test_prod)
        prod_mse = mean_squared_error(self.y_test_prod, y_pred_prod)
        prod_r2 = r2_score(self.y_test_prod, y_pred_prod)
        
        # Stress model metrics
        y_pred_stress = self.stress_model.predict(self.X_test_stress)
        stress_accuracy = accuracy_score(self.y_test_stress, y_pred_stress)
        
        return {
            "productivity_model": {
                "type": "Regression (Random Forest)",
                "mse": float(prod_mse),
                "r2_score": float(prod_r2),
                "rmse": float(np.sqrt(prod_mse))
            },
            "stress_model": {
                "type": "Classification (Random Forest)",
                "accuracy": float(stress_accuracy)
            }
        }