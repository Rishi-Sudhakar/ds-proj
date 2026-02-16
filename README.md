# 📱 Smartphone Usage & Productivity Analytics Dashboard

A full-stack machine learning application for analyzing smartphone usage patterns and predicting productivity and stress levels.

## 🎯 Features

- **ML-Powered Predictions**
  - Productivity Score Prediction (Regression)
  - Stress Level Prediction (Classification)
  
- **Data Visualizations**
  - Distribution plots
  - Correlation matrix heatmap
  - Scatter plots
  - Occupation-based analysis
  - Device comparison (Android vs iOS)
  
- **Interactive Dashboard**
  - Real-time statistics
  - Model performance metrics
  - Data explorer

## 🛠️ Tech Stack

### Backend
- **FastAPI** (v0.129.0+) - Modern Python web framework
- **scikit-learn** (v1.8.0+) - Machine learning models (Random Forest)
- **pandas** (v3.0.0+) - Data manipulation (Python 3.14 compatible)
- **numpy** (v2.4.2+) - Numerical computations
- **matplotlib** (v3.10.8+) - Data visualization
- **seaborn** (v0.13.2+) - Statistical visualizations

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast dev server and build tool
- **Neo Brutalism** - Bold, high-contrast UI design
- **Step-by-step pipeline** - See backend steps as you explore

## 📦 Installation

**Requirements:**
- Python 3.14+ (or Python 3.11+ for older versions)
- All dependencies are compatible with Python 3.14

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Upgrade pip** (recommended)
```bash
pip install --upgrade pip
```

3. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

4. **Ensure the dataset is in the root directory**
   - File: `Smartphone_Usage_Productivity_Dataset_50000.csv`

**Note:** The project uses the latest versions of all dependencies, including pandas 3.0.0 which fully supports Python 3.14. All packages have been tested and are compatible.

## 🚀 Running the Application

### Start the Backend Server

```bash
cd backend
python main.py
```

Or using uvicorn directly:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Start the Frontend

The frontend uses **Vite + TypeScript** with a **Neo Brutalism** design and a **step-by-step pipeline** that shows what each backend call does.

```bash
cd frontend && npm install && npm run dev
```

Or use the start script:
```bash
./start_frontend.sh
```

Then open `http://localhost:8080` in your browser.

**Important:** Start the backend first (`./start_backend.sh`) so the frontend can proxy API requests to it.

## 📊 API Endpoints

### Data Endpoints
- `GET /api/data/stats` - Get dataset statistics
- `GET /api/data/sample?limit=100` - Get sample data

### ML Prediction Endpoints
- `POST /api/ml/predict/productivity` - Predict productivity score
- `POST /api/ml/predict/stress` - Predict stress level
- `GET /api/ml/model/performance` - Get model performance metrics

### Visualization Endpoints
- `GET /api/viz/distribution/{column}` - Get distribution plot
- `GET /api/viz/correlation` - Get correlation matrix
- `GET /api/viz/scatter/{x_column}/{y_column}` - Get scatter plot
- `GET /api/viz/boxplot/{column}` - Get boxplot
- `GET /api/viz/occupation-analysis` - Get occupation analysis
- `GET /api/viz/device-comparison` - Get device comparison

## 📈 Dataset Information

The dataset contains 50,000 records with the following features:

- **User_ID** - Unique identifier
- **Age** - User age (18-60)
- **Gender** - Male, Female, Other
- **Occupation** - Student, Professional, Freelancer, Business Owner
- **Device_Type** - Android / iOS
- **Daily_Phone_Hours** - Average daily phone usage
- **Social_Media_Hours** - Daily time spent on social media
- **Work_Productivity_Score** - Productivity score (1-10)
- **Sleep_Hours** - Average sleep duration
- **Stress_Level** - Stress rating (1-10)
- **App_Usage_Count** - Number of apps used daily
- **Caffeine_Intake_Cups** - Daily caffeine consumption
- **Weekend_Screen_Time_Hours** - Screen time during weekends

## 🤖 Machine Learning Models

### Productivity Prediction Model
- **Type**: Random Forest Regressor
- **Target**: Work_Productivity_Score (1-10)
- **Features**: Age, Gender, Occupation, Device_Type, Daily_Phone_Hours, Social_Media_Hours, Sleep_Hours, App_Usage_Count, Caffeine_Intake_Cups, Weekend_Screen_Time_Hours

### Stress Level Prediction Model
- **Type**: Random Forest Classifier
- **Target**: Stress_Level (1-10)
- **Features**: Age, Gender, Occupation, Device_Type, Daily_Phone_Hours, Social_Media_Hours, Sleep_Hours, Work_Productivity_Score, App_Usage_Count, Caffeine_Intake_Cups, Weekend_Screen_Time_Hours

## 📁 Project Structure

```
ds-proj/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── ml_models.py         # ML model training and prediction
│   └── visualizations.py   # Data visualization functions
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styles
│   └── app.js              # JavaScript application logic
├── Smartphone_Usage_Productivity_Dataset_50000.csv
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🔧 Development

### Backend Development
The backend uses FastAPI with automatic API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Development
The frontend is a single-page application with tabbed navigation:
- Dashboard: Overview statistics and model performance
- ML Predictions: Interactive prediction forms
- Visualizations: Data visualization gallery
- Data Explorer: Browse the dataset

## 📝 Notes

- The ML models are trained automatically when the backend starts
- Model training uses 80% of the data for training and 20% for testing
- All visualizations are generated server-side and returned as base64-encoded images
- CORS is enabled for all origins (adjust in production)

## 🎓 Use Cases

- Behavioral research and analysis
- Productivity optimization
- Stress level assessment
- Device usage pattern analysis
- Lifestyle impact studies

## 📄 License

This project uses a dataset with CC0: Public Domain license.

## 🤝 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.