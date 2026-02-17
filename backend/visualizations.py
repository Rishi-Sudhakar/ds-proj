import pandas as pd
import numpy as np
import os

class Visualizations:
    def __init__(self):
        # Use the student productivity & distraction dataset
        csv_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'student_productivity_distraction_dataset_20000.csv',
        )
        self.df = pd.read_csv(csv_path)
    
    def get_distribution_data(self, column):
        """Get distribution data (histogram and boxplot stats) for a numeric column"""
        if column not in self.df.columns:
            raise ValueError(f"Column {column} not found in dataset")
        
        series = self.df[column]
        
        # Histogram data
        counts, bin_edges = np.histogram(series, bins=50)
        
        # Boxplot stats
        q1 = series.quantile(0.25)
        median = series.median()
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        min_val = series.min()
        max_val = series.max()
        
        # Outliers (simplified: just count them or return a sample? 
        # For simplicity in Chart.js, we often just show the whiskers. 
        # But let's return the standard box plot numbers.)
        
        return {
            "histogram": {
                "counts": counts.tolist(),
                "bin_edges": bin_edges.tolist()
            },
            "boxplot": {
                "min": float(min_val),
                "q1": float(q1),
                "median": float(median),
                "q3": float(q3),
                "max": float(max_val),
                "lower_whisker": float(max(min_val, lower_bound)),
                "upper_whisker": float(min(max_val, upper_bound))
            }
        }
    
    def get_correlation_matrix_data(self):
        """Get correlation matrix data"""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
        corr_matrix = self.df[numeric_cols].corr()
        
        # Convert to a list of lists or a dict that's easy to parse
        # Format: { columns: [...], values: [[1.0, 0.5], [0.5, 1.0]] }
        return {
            "columns": numeric_cols,
            "values": corr_matrix.values.tolist()
        }
    
    def get_scatter_data(self, x_column, y_column):
        """Get scatter plot data and linear regression line"""
        if x_column not in self.df.columns or y_column not in self.df.columns:
            raise ValueError("One or both columns not found in dataset")
        
        # Subsample if data is huge to avoid browser lag, though 20k is borderline ok. 
        # Let's limit to 2000 random points for rendering performance.
        sample_df = self.df.sample(n=min(len(self.df), 2000), random_state=42)
        
        x_data = sample_df[x_column].tolist()
        y_data = sample_df[y_column].tolist()
        
        # Calculate trend line on full dataset for accuracy
        z = np.polyfit(self.df[x_column], self.df[y_column], 1)
        # z is [slope, intercept]
        
        return {
            "points": [{"x": x, "y": y} for x, y in zip(x_data, y_data)],
            "trend_line": {
                "slope": float(z[0]),
                "intercept": float(z[1]),
                "min_x": float(self.df[x_column].min()),
                "max_x": float(self.df[x_column].max())
            }
        }
    
    def get_boxplot_data(self, column):
        """Get boxplot stats for a column"""
        # Re-use logic from distribution if needed, but here we just return the stats
        return self.get_distribution_data(column)["boxplot"]
    
    def get_occupation_analysis_data(self):
        """Get analysis grouped by gender (Productivity & Study Hours)"""
        if 'gender' not in self.df.columns:
            raise ValueError("Column 'gender' not found in dataset")

        # Productivity by gender
        metrics_by_gender = (
            self.df.groupby('gender')[['productivity_score', 'study_hours_per_day']]
            .mean()
            .sort_index()
        )
        
        return {
            "categories": metrics_by_gender.index.tolist(),
            "series1": metrics_by_gender['productivity_score'].tolist(),
            "series2": metrics_by_gender['study_hours_per_day'].tolist(),
            "labels": ["Avg Productivity", "Avg Study Hours"]
        }
    
    def get_device_comparison_data(self):
        """Get comparison between stress bands (Productivity & Sleep Hours)"""
        if 'stress_level' not in self.df.columns:
            raise ValueError("Column 'stress_level' not found in dataset")

        bins = [0, 3, 7, 10]
        labels = ['Low (0-3)', 'Medium (4-7)', 'High (8-10)']
        
        # Create a copy to avoid SettingWithCopy warnings on self.df
        temp_df = self.df[['stress_level', 'productivity_score', 'sleep_hours']].copy()
        
        temp_df['stress_band'] = pd.cut(
            temp_df['stress_level'],
            bins=bins,
            labels=labels,
            include_lowest=True,
        )
        
        grouped = temp_df.groupby('stress_band', observed=True)[['productivity_score', 'sleep_hours']].mean()
        
        return {
            "categories": labels,
            "series1": grouped['productivity_score'].tolist(),
            "series2": grouped['sleep_hours'].tolist(),
             "labels": ["Avg Productivity", "Avg Sleep Hours"]
        }