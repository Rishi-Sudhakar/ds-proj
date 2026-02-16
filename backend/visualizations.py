import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
import os

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)

class Visualizations:
    def __init__(self):
        # Use the student productivity & distraction dataset
        csv_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'student_productivity_distraction_dataset_20000.csv',
        )
        self.df = pd.read_csv(csv_path)
    
    def _fig_to_base64(self, fig):
        """Convert matplotlib figure to base64 string"""
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        return img_base64
    
    def plot_distribution(self, column):
        """Plot distribution of a numeric column"""
        if column not in self.df.columns:
            raise ValueError(f"Column {column} not found in dataset")
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 5))
        
        # Histogram
        axes[0].hist(self.df[column], bins=50, edgecolor='black', alpha=0.7, color='skyblue')
        axes[0].set_title(f'Distribution of {column}', fontsize=14, fontweight='bold')
        axes[0].set_xlabel(column)
        axes[0].set_ylabel('Frequency')
        axes[0].grid(True, alpha=0.3)
        
        # Box plot
        axes[1].boxplot(self.df[column], vert=True)
        axes[1].set_title(f'Box Plot of {column}', fontsize=14, fontweight='bold')
        axes[1].set_ylabel(column)
        axes[1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_correlation_matrix(self):
        """Plot correlation matrix heatmap"""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        corr_matrix = self.df[numeric_cols].corr()
        
        fig, ax = plt.subplots(figsize=(12, 10))
        sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', 
                   center=0, square=True, linewidths=1, cbar_kws={"shrink": 0.8}, ax=ax)
        ax.set_title('Correlation Matrix Heatmap', fontsize=16, fontweight='bold', pad=20)
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_scatter(self, x_column, y_column):
        """Plot scatter plot between two columns"""
        if x_column not in self.df.columns or y_column not in self.df.columns:
            raise ValueError("One or both columns not found in dataset")
        
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.scatter(self.df[x_column], self.df[y_column], alpha=0.5, s=20)
        ax.set_xlabel(x_column, fontsize=12)
        ax.set_ylabel(y_column, fontsize=12)
        ax.set_title(f'{x_column} vs {y_column}', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        
        # Add trend line
        z = np.polyfit(self.df[x_column], self.df[y_column], 1)
        p = np.poly1d(z)
        ax.plot(self.df[x_column], p(self.df[x_column]), "r--", alpha=0.8, linewidth=2)
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_boxplot(self, column):
        """Plot boxplot for a column"""
        if column not in self.df.columns:
            raise ValueError(f"Column {column} not found in dataset")
        
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.boxplot(self.df[column], vert=True)
        ax.set_ylabel(column, fontsize=12)
        ax.set_title(f'Box Plot of {column}', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3, axis='y')
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_occupation_analysis(self):
        """Plot analysis grouped by discrete categories (here: gender)

        We intentionally focus on the two metrics that vary the most
        across genders in this dataset: coffee intake and exercise
        minutes. These are less flat than, e.g., productivity.
        """
        if 'gender' not in self.df.columns:
            raise ValueError("Column 'gender' not found in dataset")
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        # Coffee intake by gender
        coffee_by_gender = (
            self.df.groupby('gender')['coffee_intake_mg']
            .mean()
            .sort_values()
        )
        axes[0].barh(coffee_by_gender.index, coffee_by_gender.values, color='saddlebrown')
        axes[0].set_xlabel('Average Coffee Intake (mg)')
        axes[0].set_title('Coffee Intake by Gender', fontsize=12, fontweight='bold')
        axes[0].grid(True, alpha=0.3, axis='x')

        # Exercise minutes by gender
        exercise_by_gender = (
            self.df.groupby('gender')['exercise_minutes']
            .mean()
            .sort_values()
        )
        axes[1].barh(exercise_by_gender.index, exercise_by_gender.values, color='mediumseagreen')
        axes[1].set_xlabel('Average Exercise Minutes')
        axes[1].set_title('Exercise by Gender', fontsize=12, fontweight='bold')
        axes[1].grid(True, alpha=0.3, axis='x')

        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_device_comparison(self):
        """Plot comparison between low/medium/high stress bands.

        We focus on two of the more interesting (less linear) metrics:
        productivity_score and coffee_intake_mg.
        """
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

        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        band_groups = self.df.groupby('stress_band')

        # Productivity comparison (users tend to report lower productivity at higher stress)
        prod_by_band = band_groups['productivity_score'].mean()
        axes[0].bar(prod_by_band.index.astype(str), prod_by_band.values, color=['#34A853', '#FFB300', '#EA4335'])
        axes[0].set_ylabel('Average Productivity Score')
        axes[0].set_title('Productivity vs Stress Band', fontsize=12, fontweight='bold')
        axes[0].grid(True, alpha=0.3, axis='y')

        # Coffee intake comparison (non‑linear bump around medium stress)
        coffee_by_band = band_groups['coffee_intake_mg'].mean()
        axes[1].bar(coffee_by_band.index.astype(str), coffee_by_band.values, color=['#34A853', '#FFB300', '#EA4335'])
        axes[1].set_ylabel('Average Coffee Intake (mg)')
        axes[1].set_title('Coffee Intake vs Stress Band', fontsize=12, fontweight='bold')
        axes[1].grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        return self._fig_to_base64(fig)