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
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'Smartphone_Usage_Productivity_Dataset_50000.csv')
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
        """Plot analysis grouped by occupation"""
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        
        # Productivity by Occupation
        occupation_prod = self.df.groupby('Occupation')['Work_Productivity_Score'].mean().sort_values()
        axes[0, 0].barh(occupation_prod.index, occupation_prod.values, color='steelblue')
        axes[0, 0].set_xlabel('Average Productivity Score')
        axes[0, 0].set_title('Average Productivity by Occupation', fontsize=12, fontweight='bold')
        axes[0, 0].grid(True, alpha=0.3, axis='x')
        
        # Stress Level by Occupation
        occupation_stress = self.df.groupby('Occupation')['Stress_Level'].mean().sort_values()
        axes[0, 1].barh(occupation_stress.index, occupation_stress.values, color='coral')
        axes[0, 1].set_xlabel('Average Stress Level')
        axes[0, 1].set_title('Average Stress Level by Occupation', fontsize=12, fontweight='bold')
        axes[0, 1].grid(True, alpha=0.3, axis='x')
        
        # Phone Hours by Occupation
        occupation_phone = self.df.groupby('Occupation')['Daily_Phone_Hours'].mean().sort_values()
        axes[1, 0].barh(occupation_phone.index, occupation_phone.values, color='mediumseagreen')
        axes[1, 0].set_xlabel('Average Daily Phone Hours')
        axes[1, 0].set_title('Average Phone Usage by Occupation', fontsize=12, fontweight='bold')
        axes[1, 0].grid(True, alpha=0.3, axis='x')
        
        # Sleep Hours by Occupation
        occupation_sleep = self.df.groupby('Occupation')['Sleep_Hours'].mean().sort_values()
        axes[1, 1].barh(occupation_sleep.index, occupation_sleep.values, color='plum')
        axes[1, 1].set_xlabel('Average Sleep Hours')
        axes[1, 1].set_title('Average Sleep Hours by Occupation', fontsize=12, fontweight='bold')
        axes[1, 1].grid(True, alpha=0.3, axis='x')
        
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def plot_device_comparison(self):
        """Plot comparison between Android and iOS"""
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        
        device_groups = self.df.groupby('Device_Type')
        
        # Productivity comparison
        prod_by_device = device_groups['Work_Productivity_Score'].mean()
        axes[0, 0].bar(prod_by_device.index, prod_by_device.values, color=['#34A853', '#007AFF'])
        axes[0, 0].set_ylabel('Average Productivity Score')
        axes[0, 0].set_title('Productivity Score: Android vs iOS', fontsize=12, fontweight='bold')
        axes[0, 0].grid(True, alpha=0.3, axis='y')
        
        # Stress Level comparison
        stress_by_device = device_groups['Stress_Level'].mean()
        axes[0, 1].bar(stress_by_device.index, stress_by_device.values, color=['#34A853', '#007AFF'])
        axes[0, 1].set_ylabel('Average Stress Level')
        axes[0, 1].set_title('Stress Level: Android vs iOS', fontsize=12, fontweight='bold')
        axes[0, 1].grid(True, alpha=0.3, axis='y')
        
        # Phone Hours comparison
        phone_by_device = device_groups['Daily_Phone_Hours'].mean()
        axes[1, 0].bar(phone_by_device.index, phone_by_device.values, color=['#34A853', '#007AFF'])
        axes[1, 0].set_ylabel('Average Daily Phone Hours')
        axes[1, 0].set_title('Phone Usage: Android vs iOS', fontsize=12, fontweight='bold')
        axes[1, 0].grid(True, alpha=0.3, axis='y')
        
        # Sleep Hours comparison
        sleep_by_device = device_groups['Sleep_Hours'].mean()
        axes[1, 1].bar(sleep_by_device.index, sleep_by_device.values, color=['#34A853', '#007AFF'])
        axes[1, 1].set_ylabel('Average Sleep Hours')
        axes[1, 1].set_title('Sleep Hours: Android vs iOS', fontsize=12, fontweight='bold')
        axes[1, 1].grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        return self._fig_to_base64(fig)