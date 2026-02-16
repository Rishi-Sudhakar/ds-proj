// API response types

export interface DataStats {
  total_records: number;
  columns: string[];
  numeric_stats: Record<string, NumericStat>;
  categorical_counts: Record<string, Record<string, number>>;
}

export interface NumericStat {
  count: number;
  mean: number;
  std: number;
  min: number;
  '25%': number;
  '50%': number;
  '75%': number;
  max: number;
}

export interface ModelPerformance {
  productivity_model?: {
    type: string;
    mse: number;
    r2_score: number;
    rmse: number;
  };
  stress_model?: {
    type: string;
    accuracy: number;
  };
}

export interface PredictionParams {
  age: number;
  gender: string;
  occupation: string;
  device_type: string;
  daily_phone_hours: number;
  social_media_hours: number;
  sleep_hours: number;
  app_usage_count: number;
  caffeine_intake: number;
  weekend_screen_time: number;
}

export interface ProductivityParams extends PredictionParams {
  stress_level: number;
}

export interface StressParams extends PredictionParams {
  work_productivity_score: number;
}
