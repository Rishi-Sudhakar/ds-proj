# 📱 Smartphone Usage & Productivity Analytics Dashboard

A full-stack machine learning application for analyzing smartphone usage patterns and predicting productivity and stress levels.

## 🎯 Features

- **ML-Powered Predictions**
  - Productivity score prediction (Random Forest regression)
  - Stress band prediction (3-class Random Forest classification: low / medium / high)
- **Data Visualizations**
  - Distribution plots
  - Correlation matrix heatmap
  - Relationship explorer (scatter + trend line)
  - Gender-based quick insights (coffee intake & exercise)
  - Stress-band quick insights (productivity & coffee)
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

### Frontend

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast dev server and build tool
- **Chart.js** - Interactive client-side visualizations
- **Neo Brutalism** - Bold, high-contrast UI design
- **Step-by-step pipeline** - See backend steps as you explore

## 📦 Installation

**Requirements:**

- Python 3.14+ (or Python 3.11+ for older versions)
- Node.js 18+ and npm (for the Vite + TypeScript frontend)

1. **Clone the repository** (or navigate to the project directory)

2. **Install Python dependencies**

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Ensure the dataset is present**
   - File: `student_productivity_distraction_dataset_20000.csv` must be in the project root next to `requirements.txt`.

**Note:** The project uses recent versions of FastAPI, pandas, scikit-learn, and others that are compatible with Python 3.14.

## 🚀 Running the Application

You typically want the backend and frontend running in **two terminals**.

### 1. Start the Backend API

From the project root:

```bash
./start_backend.sh
```

This runs:

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2. Start the Frontend (Vite Dev Server)

From the project root:

```bash
./start_frontend.sh
```

This runs the Vite dev server on port `8080`:

```bash
cd frontend
npm run dev
```

Then open `http://localhost:8080` in your browser.

**Important:** Start the backend **before** the frontend so that `/api` requests can be proxied correctly from Vite to FastAPI.

## 📊 API Endpoints

### Data Endpoints

- `GET /api/data/stats` - Get dataset statistics
- `GET /api/data/sample?limit=100` - Get sample data

### ML Prediction Endpoints

- `POST /api/ml/predict/productivity` - Predict productivity score
- `POST /api/ml/predict/stress` - Predict stress level
- `GET /api/ml/model/performance` - Get model performance metrics

### Visualization Endpoints (JSON Data)

- `GET /api/viz/distribution/{column}` - Get histogram and boxplot data
- `GET /api/viz/correlation` - Get correlation matrix data
- `GET /api/viz/scatter/{x_column}/{y_column}` - Get scatter plot points and trend line
- `GET /api/viz/occupation-analysis` - Get gender-based productivity & study hours metrics
- `GET /api/viz/device-comparison` - Get stress-based productivity & sleep hours metrics

## 📈 Dataset Information

The project now uses a **student productivity & distraction dataset** with 20,000 records:

- **student_id** – Unique identifier
- **age** – Student age
- **gender** – Male, Female, Other
- **study_hours_per_day** – Average daily study time
- **sleep_hours** – Average sleep duration
- **phone_usage_hours** – Daily phone usage hours
- **social_media_hours** – Time spent on social media
- **youtube_hours** – Time spent on YouTube
- **gaming_hours** – Time spent gaming
- **breaks_per_day** – Number of breaks taken per day
- **coffee_intake_mg** – Daily caffeine intake in mg
- **exercise_minutes** – Daily exercise duration
- **assignments_completed** – Number of assignments completed
- **attendance_percentage** – Attendance rate
- **stress_level** – Stress rating (1–10)
- **focus_score** – Focus/attention score
- **final_grade** – Final academic grade
- **productivity_score** – Overall productivity score

## 🤖 Machine Learning Models

### Productivity Prediction Model

- **Type**: Random Forest Regressor
- **Target**: `productivity_score`
- **Features** (fixed set, matches frontend + Colab notebook):
  - `age`, `study_hours_per_day`, `sleep_hours`, `phone_usage_hours`,
  - `social_media_hours`, `youtube_hours`, `gaming_hours`,
  - `breaks_per_day`, `coffee_intake_mg`, `exercise_minutes`,
  - `assignments_completed`, `attendance_percentage`, `stress_level`

### Stress Band Prediction Model

- **Type**: Random Forest Classifier
- **Target**: Binned `stress_level` (3 classes: low, medium, high)
- **Features**:
  - Same habits as above, but with `productivity_score` instead of `stress_level`

## 📁 Project Structure

```text
ds-proj/
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application and API routes
│   ├── ml_models.py            # ML model training, prediction, and metrics
│   └── visualizations.py       # Matplotlib / seaborn visualizations
├── frontend/
│   ├── index.html              # Vite entry HTML
│   ├── package.json            # Frontend dependencies and scripts
│   ├── tsconfig.json           # TypeScript config
│   ├── vite.config.ts          # Vite dev server + API proxy
│   └── src/
│       ├── main.ts             # Frontend entry point
│       ├── app.ts              # Neo-brutalist step-by-step pipeline UI + logic
│       ├── styles.css          # Global Neo Brutalism styling
│       ├── api/client.ts       # Typed API client
│       └── types/api.ts        # Shared API response/request types
├── student_productivity_distraction_dataset_20000.csv
├── requirements.txt            # Python backend dependencies
├── start_backend.sh            # Convenience script to launch backend
├── start_frontend.sh           # Convenience script to launch frontend (Vite)
├── student_productivity_colab.ipynb
├── README.md                   # High-level overview & quickstart (this file)
└── DOCUMENTATION.md            # In-depth architecture, ML logic & Colab notes
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
- All visualizations are rendered client-side using Chart.js based on JSON data from the backend
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
