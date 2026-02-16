import * as api from './api/client';
import type { DataStats, ModelPerformance, ProductivityParams, StressParams } from './types/api';

type StepStatus = 'pending' | 'loading' | 'done' | 'error';

// Numeric columns from the actual dataset
const NUMERIC_COLUMNS = [
  { value: 'Age', label: 'Age' },
  { value: 'Daily_Phone_Hours', label: 'Daily Phone Hours' },
  { value: 'Social_Media_Hours', label: 'Social Media Hours' },
  { value: 'Work_Productivity_Score', label: 'Work Productivity Score' },
  { value: 'Sleep_Hours', label: 'Sleep Hours' },
  { value: 'Stress_Level', label: 'Stress Level' },
  { value: 'App_Usage_Count', label: 'App Usage Count' },
  { value: 'Caffeine_Intake_Cups', label: 'Caffeine Intake (Cups)' },
  { value: 'Weekend_Screen_Time_Hours', label: 'Weekend Screen Time (Hours)' },
];

// Meaningful scatter plot pairs
const SCATTER_PAIRS = [
  { x: 'Daily_Phone_Hours', y: 'Work_Productivity_Score', xLabel: 'Daily Phone Hours', yLabel: 'Productivity Score' },
  { x: 'Social_Media_Hours', y: 'Stress_Level', xLabel: 'Social Media Hours', yLabel: 'Stress Level' },
  { x: 'Sleep_Hours', y: 'Work_Productivity_Score', xLabel: 'Sleep Hours', yLabel: 'Productivity Score' },
  { x: 'Sleep_Hours', y: 'Stress_Level', xLabel: 'Sleep Hours', yLabel: 'Stress Level' },
  { x: 'Caffeine_Intake_Cups', y: 'Stress_Level', xLabel: 'Caffeine Intake', yLabel: 'Stress Level' },
  { x: 'Daily_Phone_Hours', y: 'Sleep_Hours', xLabel: 'Daily Phone Hours', yLabel: 'Sleep Hours' },
  { x: 'Age', y: 'Work_Productivity_Score', xLabel: 'Age', yLabel: 'Productivity Score' },
  { x: 'App_Usage_Count', y: 'Daily_Phone_Hours', xLabel: 'App Usage Count', yLabel: 'Daily Phone Hours' },
];

const VIZ_TYPES = [
  { id: 'correlation', label: 'Correlation Matrix', endpoint: '/api/viz/correlation' },
  { id: 'occupation', label: 'Occupation Analysis', endpoint: '/api/viz/occupation-analysis' },
  { id: 'device', label: 'Device Comparison', endpoint: '/api/viz/device-comparison' },
] as const;

function $(sel: string, parent?: ParentNode): HTMLElement | null {
  return (parent ?? document).querySelector(sel);
}

function setStepStatus(stepId: string, status: StepStatus, showRefresh = false): void {
  applyStepStatus(stepId, status, showRefresh);
}

function applyStepStatus(stepId: string, status: StepStatus, showRefresh = false): void {
  const header = $(`[data-step="${stepId}"] .step-header`);
  if (!header) return;

  const statusEl = header.querySelector('.step-status');
  if (statusEl) {
    // Visually we only distinguish Pending / Done / Error.
    let visualStatus: 'pending' | 'done' | 'error' =
      status === 'done' ? 'done' : status === 'error' ? 'error' : 'pending';

    statusEl.className = `step-status ${visualStatus}`;
    statusEl.textContent =
      visualStatus === 'done' ? 'Done' : visualStatus === 'error' ? 'Error' : 'Pending';
  }

  // Remove existing refresh button
  const existingRefresh = header.querySelector('.refresh-btn');
  if (existingRefresh) existingRefresh.remove();

  // Add refresh button if needed
  if (showRefresh && status === 'done' && statusEl) {
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    // Icon + label so height naturally matches the status pill
    refreshBtn.innerHTML = `<span class="refresh-icon" aria-hidden="true">↻</span><span class="refresh-text">Refresh</span>`;
    refreshBtn.setAttribute('title', 'Refresh this step');
    refreshBtn.onclick = (e) => {
      e.stopPropagation();
      refreshStep(stepId);
    };
    statusEl.parentNode?.insertBefore(refreshBtn, statusEl.nextSibling);
  }
}

function resetStep(stepId: string): void {
  setStepStatus(stepId, 'pending');
  const container = $(`[data-step="${stepId}"] .step-content`);
  if (container) {
    // Clear content based on step
    if (stepId === 'stats') {
      container.querySelector('#stats-container')!.innerHTML = '';
    } else if (stepId === 'viz') {
      container.querySelector('#viz-container')!.innerHTML = '<p class="viz-placeholder">Choose a visualization</p>';
    } else if (stepId === 'models') {
      container.querySelector('#models-container')!.innerHTML = '';
    } else if (stepId === 'predict') {
      container.querySelector('#productivity-result')!.classList.remove('show');
      container.querySelector('#stress-result')!.classList.remove('show');
    }
  }
}

// Actually re-run a step when the user clicks Refresh
async function refreshStep(stepId: string): Promise<void> {
  // Delegate to the underlying handlers so behavior stays identical to the first run
  if (stepId === 'dataset') {
    (document.getElementById('load-dataset') as HTMLButtonElement | null)?.click();
  } else if (stepId === 'stats') {
    (document.getElementById('load-stats') as HTMLButtonElement | null)?.click();
  } else if (stepId === 'viz') {
    const distBtn = document.getElementById('load-dist') as HTMLButtonElement | null;
    if (distBtn) distBtn.click();
  } else if (stepId === 'models') {
    (document.getElementById('load-models') as HTMLButtonElement | null)?.click();
  } else if (stepId === 'predict') {
    const prodForm = document.getElementById('productivity-form') as HTMLFormElement | null;
    const stressForm = document.getElementById('stress-form') as HTMLFormElement | null;
    if (prodForm) {
      prodForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
    if (stressForm) {
      stressForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  }
}

function resetDependentSteps(): void {
  // Reset steps that depend on dataset
  resetStep('stats');
  resetStep('viz');
  resetStep('models');
  resetStep('predict');
}

function toggleStep(stepId: string): void {
  const content = $(`[data-step="${stepId}"] .step-content`);
  if (content) content.classList.toggle('collapsed');
}

function renderDataTable(data: Record<string, unknown>[]): string {
  if (!data.length) return '<p>No data</p>';
  const cols = Object.keys(data[0]);
  let html = '<table class="data-table"><thead><tr>';
  cols.forEach(c => { html += `<th>${c}</th>`; });
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    html += '<tr>';
    cols.forEach(c => { html += `<td>${row[c] ?? ''}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function renderStats(stats: DataStats): string {
  const s = stats.numeric_stats;
  const cards = [
    { label: 'Total Records', value: stats.total_records.toLocaleString() },
    { label: 'Avg Productivity', value: s.Work_Productivity_Score?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Stress', value: s.Stress_Level?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Phone Hrs', value: s.Daily_Phone_Hours?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Sleep Hrs', value: s.Sleep_Hours?.mean.toFixed(2) ?? '-' },
  ];
  return cards.map((c, i) => `
    <div class="stat-card ${i % 2 ? 'alt' : ''}">
      <h4>${c.label}</h4>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function renderModelMetrics(perf: ModelPerformance): string {
  const cards: string[] = [];
  if (perf.productivity_model) {
    cards.push(`
      <div class="metric-card">
        <h4>${perf.productivity_model.type}</h4>
        <p><strong>R²:</strong> ${perf.productivity_model.r2_score.toFixed(4)}</p>
        <p><strong>RMSE:</strong> ${perf.productivity_model.rmse.toFixed(4)}</p>
        <p><strong>MSE:</strong> ${perf.productivity_model.mse.toFixed(4)}</p>
      </div>
    `);
  }
  if (perf.stress_model) {
    cards.push(`
      <div class="metric-card">
        <h4>${perf.stress_model.type}</h4>
        <p><strong>Accuracy:</strong> ${(perf.stress_model.accuracy * 100).toFixed(2)}%</p>
      </div>
    `);
  }
  return cards.length ? cards.join('') : '<p>No model metrics</p>';
}

export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app">
      <header class="header">
        <h1>📱 Smartphone Usage & Productivity Analytics</h1>
        <p>Machine Learning Pipeline — Explore, Visualize, Predict</p>
      </header>

      <div class="pipeline">
        <!-- Step 1: Load Dataset -->
        <section class="step" data-step="dataset">
          <div class="step-header" data-toggle="dataset">
            <span class="step-number">1</span>
            <span class="step-title">Load Dataset</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
              <label style="font-weight:600;">Rows:</label>
              <input type="number" id="data-limit" class="row-input" value="100" min="1" max="1000">
              <button class="btn" id="load-dataset">Load Data</button>
            </div>
            <div class="data-table-wrap" id="dataset-container">
              <p class="viz-placeholder">Click "Load Data" to view the dataset</p>
            </div>
          </div>
        </section>

        <!-- Step 2: Statistics -->
        <section class="step" data-step="stats">
          <div class="step-header" data-toggle="stats">
            <span class="step-number">2</span>
            <span class="step-title">Explore Statistics</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="margin-bottom:16px;">
              <button class="btn btn-secondary" id="load-stats">Load Statistics</button>
            </div>
            <div id="stats-container"></div>
          </div>
        </section>

        <!-- Step 3: Visualize -->
        <section class="step" data-step="viz">
          <div class="step-header" data-toggle="viz">
            <span class="step-number">3</span>
            <span class="step-title">Visualize (EDA)</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div class="viz-buttons">
              ${VIZ_TYPES.map(v => `<button class="btn" data-viz="${v.endpoint}">${v.label}</button>`).join('')}
            </div>
            <div class="viz-row">
              <select id="dist-column">
                ${NUMERIC_COLUMNS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
              </select>
              <button class="btn" id="load-dist">Distribution Plot</button>
            </div>
            <div class="viz-row">
              <select id="scatter-pair">
                ${SCATTER_PAIRS.map((p, i) => `<option value="${i}">${p.xLabel} vs ${p.yLabel}</option>`).join('')}
              </select>
              <button class="btn" id="load-scatter">Scatter Plot</button>
            </div>
            <div class="viz-container" id="viz-container">
              <p class="viz-placeholder">Choose a visualization</p>
            </div>
          </div>
        </section>

        <!-- Step 4: Model Performance -->
        <section class="step" data-step="models">
          <div class="step-header" data-toggle="models">
            <span class="step-number">4</span>
            <span class="step-title">Model Performance (Random Forest)</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="margin-bottom:16px;">
              <button class="btn btn-secondary" id="load-models">Load Model Metrics</button>
            </div>
            <div class="model-metrics" id="models-container"></div>
          </div>
        </section>

        <!-- Step 5: Predict -->
        <section class="step" data-step="predict">
          <div class="step-header" data-toggle="predict">
            <span class="step-number">5</span>
            <span class="step-title">Make Predictions</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="margin-bottom:24px;">
              <h4 style="margin-bottom:12px;">Productivity Prediction</h4>
              <form id="productivity-form" class="form-grid">
                <div class="form-group"><label>Age</label><input type="number" name="age" min="18" max="60" value="30" required></div>
                <div class="form-group"><label>Gender</label><select name="gender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div class="form-group"><label>Occupation</label><select name="occupation"><option value="Student">Student</option><option value="Professional">Professional</option><option value="Freelancer">Freelancer</option><option value="Business Owner">Business Owner</option></select></div>
                <div class="form-group"><label>Device</label><select name="device_type"><option value="Android">Android</option><option value="iOS">iOS</option></select></div>
                <div class="form-group"><label>Daily Phone Hrs</label><input type="number" name="daily_phone_hours" step="0.1" value="5" required></div>
                <div class="form-group"><label>Social Media Hrs</label><input type="number" name="social_media_hours" step="0.1" value="2" required></div>
                <div class="form-group"><label>Sleep Hrs</label><input type="number" name="sleep_hours" step="0.1" value="7" required></div>
                <div class="form-group"><label>Stress (1-10)</label><input type="number" name="stress_level" min="1" max="10" value="5" required></div>
                <div class="form-group"><label>App Count</label><input type="number" name="app_usage_count" value="30" required></div>
                <div class="form-group"><label>Caffeine Cups</label><input type="number" name="caffeine_intake" step="0.1" value="2" required></div>
                <div class="form-group"><label>Weekend Screen Hrs</label><input type="number" name="weekend_screen_time" step="0.1" value="8" required></div>
              </form>
              <button type="submit" form="productivity-form" class="btn btn-success">Predict Productivity</button>
            </div>
            <div id="productivity-result" class="result-box"></div>

            <div style="margin-top:32px;">
              <h4 style="margin-bottom:12px;">Stress Prediction</h4>
              <form id="stress-form" class="form-grid">
                <div class="form-group"><label>Age</label><input type="number" name="age" min="18" max="60" value="30" required></div>
                <div class="form-group"><label>Gender</label><select name="gender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div class="form-group"><label>Occupation</label><select name="occupation"><option value="Student">Student</option><option value="Professional">Professional</option><option value="Freelancer">Freelancer</option><option value="Business Owner">Business Owner</option></select></div>
                <div class="form-group"><label>Device</label><select name="device_type"><option value="Android">Android</option><option value="iOS">iOS</option></select></div>
                <div class="form-group"><label>Daily Phone Hrs</label><input type="number" name="daily_phone_hours" step="0.1" value="5" required></div>
                <div class="form-group"><label>Social Media Hrs</label><input type="number" name="social_media_hours" step="0.1" value="2" required></div>
                <div class="form-group"><label>Sleep Hrs</label><input type="number" name="sleep_hours" step="0.1" value="7" required></div>
                <div class="form-group"><label>Productivity (1-10)</label><input type="number" name="work_productivity_score" min="1" max="10" value="6" required></div>
                <div class="form-group"><label>App Count</label><input type="number" name="app_usage_count" value="30" required></div>
                <div class="form-group"><label>Caffeine Cups</label><input type="number" name="caffeine_intake" step="0.1" value="2" required></div>
                <div class="form-group"><label>Weekend Screen Hrs</label><input type="number" name="weekend_screen_time" step="0.1" value="8" required></div>
              </form>
              <button type="submit" form="stress-form" class="btn btn-success">Predict Stress</button>
            </div>
            <div id="stress-result" class="result-box"></div>
          </div>
        </section>
      </div>
    </div>
  `;

  // Toggle step content
  root.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => toggleStep((el as HTMLElement).dataset.toggle ?? ''));
  });

  // Track previous limit to detect changes
  let previousLimit = 100;
  
  // Step 1: Load dataset
  $('#load-dataset')?.addEventListener('click', async () => {
    const limit = Number(($('#data-limit') as HTMLInputElement)?.value ?? 100);
    const limitChanged = limit !== previousLimit;
    
    setStepStatus('dataset', 'loading');
    try {
      const data = await api.fetchSampleData(limit);
      const container = $('#dataset-container');
      if (container) container.innerHTML = renderDataTable(data);
      setStepStatus('dataset', 'done');
      
      // If limit changed, reset dependent steps
      if (limitChanged && previousLimit !== 100) {
        resetDependentSteps();
      }
      previousLimit = limit;
    } catch (e) {
      setStepStatus('dataset', 'error');
      const container = $('#dataset-container');
      if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
    }
  });
  
  // Also reset when limit input changes
  $('#data-limit')?.addEventListener('change', () => {
    const limit = Number(($('#data-limit') as HTMLInputElement)?.value ?? 100);
    if (limit !== previousLimit && previousLimit !== 100) {
      resetDependentSteps();
    }
  });

  // Step 2: Load stats
  $('#load-stats')?.addEventListener('click', async () => {
    setStepStatus('stats', 'loading');
    try {
      const stats = await api.fetchDataStats();
      const container = $('#stats-container');
      if (container) {
        container.innerHTML = `<div class="stats-grid">${renderStats(stats)}</div>`;
      }
      setStepStatus('stats', 'done', true);
    } catch (e) {
      setStepStatus('stats', 'error');
      const container = $('#stats-container');
      if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
    }
  });

  // Step 3: Visualizations
  root.querySelectorAll('[data-viz]').forEach(btn => {
    btn.addEventListener('click', async () => {
      setStepStatus('viz', 'loading');
      const viz = (btn as HTMLElement).dataset.viz;
      if (!viz) return;
      try {
        const img = await api.fetchVizImage(viz);
        const container = $('#viz-container');
        if (container) container.innerHTML = `<img src="data:image/png;base64,${img}" alt="viz">`;
        setStepStatus('viz', 'done', true);
      } catch (e) {
        setStepStatus('viz', 'error');
        const container = $('#viz-container');
        if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
      }
    });
  });

  $('#load-dist')?.addEventListener('click', async () => {
    setStepStatus('viz', 'loading');
    const col = (($('#dist-column') as HTMLSelectElement)?.value) ?? 'Daily_Phone_Hours';
    try {
      const img = await api.fetchVizImage(`/api/viz/distribution/${encodeURIComponent(col)}`);
      const container = $('#viz-container');
      if (container) container.innerHTML = `<img src="data:image/png;base64,${img}" alt="distribution">`;
      setStepStatus('viz', 'done', true);
    } catch (e) {
      setStepStatus('viz', 'error');
      const container = $('#viz-container');
      if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
    }
  });

  $('#load-scatter')?.addEventListener('click', async () => {
    setStepStatus('viz', 'loading');
    const pairIndex = Number(($('#scatter-pair') as HTMLSelectElement)?.value ?? 0);
    const pair = SCATTER_PAIRS[pairIndex];
    if (!pair) return;
    try {
      const img = await api.fetchVizImage(`/api/viz/scatter/${encodeURIComponent(pair.x)}/${encodeURIComponent(pair.y)}`);
      const container = $('#viz-container');
      if (container) container.innerHTML = `<img src="data:image/png;base64,${img}" alt="scatter">`;
      setStepStatus('viz', 'done', true);
    } catch (e) {
      setStepStatus('viz', 'error');
      const container = $('#viz-container');
      if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
    }
  });

  // Step 4: Model performance
  $('#load-models')?.addEventListener('click', async () => {
    setStepStatus('models', 'loading');
    try {
      const perf = await api.fetchModelPerformance();
      const container = $('#models-container');
      if (container) container.innerHTML = renderModelMetrics(perf);
      setStepStatus('models', 'done', true);
    } catch (e) {
      setStepStatus('models', 'error');
      const container = $('#models-container');
      if (container) container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
    }
  });

  // Step 5: Predictions
  $('#productivity-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const params: ProductivityParams = {
      age: Number(fd.get('age')),
      gender: String(fd.get('gender')),
      occupation: String(fd.get('occupation')),
      device_type: String(fd.get('device_type')),
      daily_phone_hours: Number(fd.get('daily_phone_hours')),
      social_media_hours: Number(fd.get('social_media_hours')),
      sleep_hours: Number(fd.get('sleep_hours')),
      stress_level: Number(fd.get('stress_level')),
      app_usage_count: Number(fd.get('app_usage_count')),
      caffeine_intake: Number(fd.get('caffeine_intake')),
      weekend_screen_time: Number(fd.get('weekend_screen_time')),
    };
    setStepStatus('predict', 'loading');
    try {
      const res = await api.predictProductivity(params);
      const box = $('#productivity-result');
      if (box) {
        box.innerHTML = `<h4>Prediction</h4><div class="prediction-value">${res.predicted_productivity.toFixed(2)} / 10</div><p>Productivity Score</p>`;
        box.classList.add('show');
      }
      setStepStatus('predict', 'done', true);
    } catch (err) {
      setStepStatus('predict', 'error');
      const box = $('#productivity-result');
      if (box) {
        box.innerHTML = `<div class="error">${(err as Error).message}</div>`;
        box.classList.add('show');
      }
    }
  });

  $('#stress-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const params: StressParams = {
      age: Number(fd.get('age')),
      gender: String(fd.get('gender')),
      occupation: String(fd.get('occupation')),
      device_type: String(fd.get('device_type')),
      daily_phone_hours: Number(fd.get('daily_phone_hours')),
      social_media_hours: Number(fd.get('social_media_hours')),
      sleep_hours: Number(fd.get('sleep_hours')),
      work_productivity_score: Number(fd.get('work_productivity_score')),
      app_usage_count: Number(fd.get('app_usage_count')),
      caffeine_intake: Number(fd.get('caffeine_intake')),
      weekend_screen_time: Number(fd.get('weekend_screen_time')),
    };
    setStepStatus('predict', 'loading');
    try {
      const res = await api.predictStress(params);
      const box = $('#stress-result');
      if (box) {
        box.innerHTML = `<h4>Prediction</h4><div class="prediction-value">${res.predicted_stress_level} / 10</div><p>Stress Level</p>`;
        box.classList.add('show');
      }
      setStepStatus('predict', 'done', true);
    } catch (err) {
      setStepStatus('predict', 'error');
      const box = $('#stress-result');
      if (box) {
        box.innerHTML = `<div class="error">${(err as Error).message}</div>`;
        box.classList.add('show');
      }
    }
  });
}
