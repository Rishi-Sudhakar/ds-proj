## 📚 Smartphone Usage & Productivity Analytics — Detailed Documentation

This document explains the architecture, data flow, and machine learning logic for the project.

---

## 1. High-Level Architecture

- **Backend**: FastAPI application in `backend/`
  - Serves a REST API for:
    - Dataset stats & sampling
    - ML model predictions
    - Visualization images (PNG as base64)
  - Trains ML models on startup.
- **ML Layer**: Encapsulated in `backend/ml_models.py`
  - Handles dataset loading, feature engineering, training, prediction, and metrics.
- **Visualization Layer**: `backend/visualizations.py`
  - Uses pandas + matplotlib + seaborn to generate plots.
- **Frontend**: Vite + TypeScript SPA in `frontend/`
  - Neo-brutalist UI.
  - Pipeline-style layout that guides you through:
    1. Loading data
    2. Inspecting statistics
    3. Visual exploration
    4. Model performance
    5. Predictions

The typical runtime flow:

1. Backend starts → dataset is loaded, models trained once.
2. Frontend starts → calls `/api/data/stats` to populate dashboard.
3. User interacts via the pipeline steps, which call the FastAPI endpoints.

---

## 2. Backend Architecture

### 2.1 `backend/main.py` (FastAPI App)

- Creates the FastAPI application:
  - Adds CORS middleware (open to all origins for local development).
  - Instantiates:
    - `MLModels` from `ml_models.py`
    - `Visualizations` from `visualizations.py`

**Core endpoints:**

- **Root**
  - `GET /` → health/info response (`{"message": ..., "version": ...}`).

- **Data**
  - `GET /api/data/stats`
    - Returns:
      - Total records
      - Column list
      - `numeric_stats` (from `DataFrame.describe()`)
      - Frequency counts for categorical columns.
  - `GET /api/data/sample?limit=N`
    - Returns the first `N` rows as a list of JSON records.

- **ML**
  - `POST /api/ml/predict/productivity`
    - Query parameters: age, gender, occupation, device_type, daily_phone_hours, social_media_hours, sleep_hours, stress_level, app_usage_count, caffeine_intake, weekend_screen_time.
    - Uses `MLModels.predict_productivity`, returns `{ "predicted_productivity": number }`.
  - `POST /api/ml/predict/stress`
    - Query parameters: age, gender, occupation, device_type, daily_phone_hours, social_media_hours, sleep_hours, work_productivity_score, app_usage_count, caffeine_intake, weekend_screen_time.
    - Uses `MLModels.predict_stress`, returns `{ "predicted_stress_level": int }`.
  - `GET /api/ml/model/performance`
    - Uses test splits stored at training time to compute:
      - Regression metrics (MSE, RMSE, R²) for productivity model.
      - Classification accuracy for stress model.

- **Visualizations**
  - `GET /api/viz/distribution/{column}`
  - `GET /api/viz/correlation`
  - `GET /api/viz/scatter/{x_column}/{y_column}`
  - `GET /api/viz/boxplot/{column}`
  - `GET /api/viz/occupation-analysis`
  - `GET /api/viz/device-comparison`

Each of these returns JSON:

```json
{ "image": "<base64-png>" }
```

The frontend converts this to an `<img src="data:image/png;base64,...">`.

---

## 3. Machine Learning Models (`backend/ml_models.py`)

### 3.1 Data Loading

- Reads `Smartphone_Usage_Productivity_Dataset_50000.csv` from the project root.
- Stores the full DataFrame in `self.df`.

### 3.2 Feature Engineering

- Categorical columns:
  - `Gender` (Male/Female/Other)
  - `Occupation` (Student/Professional/Freelancer/Business Owner)
  - `Device_Type` (Android/iOS)
- Each is encoded using `sklearn.preprocessing.LabelEncoder` and stored in `self.label_encoders`.
- Numeric feature columns used by both models:

  - `Age`
  - `Gender` (encoded)
  - `Occupation` (encoded)
  - `Device_Type` (encoded)
  - `Daily_Phone_Hours`
  - `Social_Media_Hours`
  - `Sleep_Hours`
  - `App_Usage_Count`
  - `Caffeine_Intake_Cups`
  - `Weekend_Screen_Time_Hours`

The helper method `prepare_features(df)`:

1. Copies the given DataFrame.
2. Applies label encoders to categorical fields.
3. Returns a `DataFrame` with the selected numeric feature columns only.

### 3.3 Training

Performed inside `train_models()` when the backend starts:

1. **Productivity Prediction**
   - **Target**: `Work_Productivity_Score` (1–10).
   - **Model**: `RandomForestRegressor` with:
     - `n_estimators=100`
     - `random_state=42`
     - `n_jobs=-1` (parallel).
   - Train/test split: 80% train, 20% test (`train_test_split`).
   - Metrics (computed on test set):
     - MSE
     - RMSE
     - R²

2. **Stress Level Prediction**
   - **Target**: `Stress_Level` (1–10).
   - **Model**: `RandomForestClassifier` with:
     - `n_estimators=100`
     - `random_state=42`
     - `n_jobs=-1`.
   - Uses the same feature matrix `X` but different target `y_stress`.
   - Train/test split: 80% train, 20% test.
   - Metric: Accuracy.

### 3.4 Prediction Methods

- `predict_productivity(...)`
  - Accepts raw values as Python types (ints/floats/strings).
  - Builds a single-row `DataFrame` with the same columns as the training data.
  - Calls `prepare_features` to encode and select features.
  - Calls `self.productivity_model.predict(X_input)[0]`.
  - Clamps and rounds to `[1, 10]` with `round(prediction, 2)`.

- `predict_stress(...)`
  - Similar pattern, but target is `Stress_Level`.
  - Output is clamped to `[1, 10]` and cast to `int`.

### 3.5 Model Performance

- `get_model_performance()`:
  - Uses stored test splits:
    - `self.X_test_prod`, `self.y_test_prod`
    - `self.X_test_stress`, `self.y_test_stress`
  - Returns a JSON-serializable dict:

    ```json
    {
      "productivity_model": {
        "type": "Regression (Random Forest)",
        "mse": ...,
        "r2_score": ...,
        "rmse": ...
      },
      "stress_model": {
        "type": "Classification (Random Forest)",
        "accuracy": ...
      }
    }
    ```

---

## 4. Visualizations (`backend/visualizations.py`)

### 4.1 Shared Setup

- Loads the same CSV into `self.df`.
- Uses:
  - `matplotlib` (with `Agg` backend for server-side plotting)
  - `seaborn` (for nicer defaults)

All plot methods:
1. Create a `matplotlib` figure.
2. Draw the plot.
3. Save to an in-memory buffer via `BytesIO`.
4. Encode to base64 and return as a string.

### 4.2 Plot Types

- **Distribution + Boxplot**
  - `plot_distribution(column)`
  - 1x2 layout:
    - Histogram (with ~50 bins) for the selected column.
    - Boxplot of the same column (outliers/scale).

- **Correlation Matrix**
  - `plot_correlation_matrix()`
  - Computes `.corr()` on numeric columns.
  - Draws a heatmap with:
    - Annotated coefficients
    - Diverging colormap (`coolwarm`)

- **Scatter with Trend Line**
  - `plot_scatter(x_column, y_column)`
  - Plain scatter plot + linear trend line.
  - `numpy.polyfit` + `poly1d` to fit and plot a red dashed line.

- **Boxplot**
  - `plot_boxplot(column)`
  - Clean single boxplot for a numeric column.

- **Occupation Analysis**
  - `plot_occupation_analysis()`
  - 2x2 layout:
    - Avg. productivity by occupation.
    - Avg. stress level by occupation.
    - Avg. daily phone hours by occupation.
    - Avg. sleep hours by occupation.

- **Device Comparison (Android vs iOS)**
  - `plot_device_comparison()`
  - 2x2 layout:
    - Avg. productivity by device.
    - Avg. stress level by device.
    - Avg. daily phone hours by device.
    - Avg. sleep hours by device.

---

## 5. Frontend Architecture (Vite + TypeScript)

### 5.1 Entry Points

- `frontend/index.html`
  - Loads `/src/main.ts` and `/src/styles.css`.
- `frontend/src/main.ts`
  - Imports global CSS.
  - Renders the app by calling `renderApp` from `app.ts` into `#app`.

### 5.2 `frontend/src/app.ts`

This file implements:

- The **pipeline layout** (5 steps):
  1. Load Dataset
  2. Explore Statistics
  3. Visualize (EDA)
  4. Model Performance
  5. Make Predictions

- Event wiring:
  - **Step headers**: toggle collapse/expand.
  - **Buttons and forms**: call the API client functions.
  - **Refresh buttons**: re-run the corresponding step.

#### Key UX Behaviors

- **Step 1: Load Dataset**
  - Has a `Rows` input (`#data-limit`) and `Load Data` button.
  - Calls `api.fetchSampleData(limit)` and renders an HTML table.
  - Changing the row limit resets dependent steps (stats, viz, models, predict).

- **Step 2: Explore Statistics**
  - `Load Statistics` button:
    - Calls `api.fetchDataStats()`.
    - Renders stat cards using `renderStats(stats)`.

- **Step 3: Visualize (EDA)**
  - Buttons for:
    - Correlation matrix
    - Occupation analysis
    - Device comparison
  - Distribution dropdown:
    - Uses `NUMERIC_COLUMNS` (matching the actual dataset).
  - Scatter dropdown:
    - Uses `SCATTER_PAIRS` with meaningful pairs (e.g. Social Media vs Stress).
  - All call `api.fetchVizImage(endpoint)` and inject `<img src="data:image/png;base64,...">` into `#viz-container`.

- **Step 4: Model Performance**
  - `Load Model Metrics` button:
    - Calls `api.fetchModelPerformance()`.
    - Renders one card for regression metrics and one for classification accuracy.

- **Step 5: Predictions**
  - Two forms:
    - Productivity prediction
    - Stress prediction
  - On submit:
    - Build strongly-typed payloads (`ProductivityParams` / `StressParams`).
    - Call `api.predictProductivity` / `api.predictStress`.
    - Show results in `#productivity-result` / `#stress-result`.

### 5.3 `frontend/src/api/client.ts`

Encapsulates all backend calls:

- `fetchDataStats()`
- `fetchSampleData(limit)`
- `fetchModelPerformance()`
- `predictProductivity(params)`
- `predictStress(params)`
- `fetchVizImage(endpoint)`

Vite’s dev server is configured (in `vite.config.ts`) to proxy `/api` to `http://localhost:8000`, so the frontend simply calls `/api/...` without worrying about CORS in dev.

### 5.4 `frontend/src/styles.css`

Implements the **Neo Brutalism** look:

- Strong borders and shadows:
  - `--border: 4px solid var(--black);`
  - `--shadow: 6px 6px 0 var(--black);`
- Bright color palette:
  - Yellow, pink, blue, green, orange.
- Square corners, no subtle gradients (except where intentional).
- Over-sized headings and bold labels.
- Custom scrollbars and sticky table headers for large datasets.

---

## 6. Data & Feature Considerations

- Dataset is synthetic but **ML-ready**:
  - No missing values.
  - Clean numeric ranges for hours, scores, counts.
- Potential future improvements:
  - Hyperparameter tuning (GridSearchCV or RandomizedSearchCV).
  - Model persistence (saving trained models to disk).
  - More advanced metrics:
    - Classification report for stress levels.
    - Feature importance plots.
  - Additional visualizations for:
    - Time-of-day usage (if data extended).
    - Multi-variable relationships (pair plots).

---

## 7. How to Extend

- **Add a new visualization**
  1. Implement a new method in `visualizations.py` returning a base64 PNG.
  2. Expose it via a new FastAPI route in `main.py`.
  3. Add a corresponding button/handler in `frontend/src/app.ts`.

- **Add a new ML model**
  1. Add a new target/feature set in `ml_models.py`.
  2. Train and store the model + test split.
  3. Add a FastAPI endpoint to call the prediction method.
  4. Add UI controls in the frontend to collect inputs and display outputs.

This architecture keeps ML logic, visualizations, and transport (API + UI) cleanly separated so you can iterate on each layer independently.

