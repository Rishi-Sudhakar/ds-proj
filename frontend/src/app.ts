import * as api from './api/client';
import type { DataStats, ModelPerformance, ProductivityParams, StressParams, DistributionData, CorrelationData, ScatterData, OccupationAnalysisData, DeviceComparisonData } from './types/api';
import Chart from 'chart.js/auto';

type StepStatus = 'pending' | 'loading' | 'done' | 'error';

// Curated distribution options
const DIST_OPTIONS = [
  { value: 'productivity_score', label: 'Productivity score', help: 'Overall productivity score for each student.' },
  { value: 'stress_level', label: 'Stress level (1–10)', help: 'Self‑reported stress levels across all students.' },
  { value: 'study_hours_per_day', label: 'Study hours per day', help: 'How many hours per day students spend studying.' },
  { value: 'phone_usage_hours', label: 'Daily phone usage hours', help: 'Total hours spent on the phone in a typical day.' },
  { value: 'social_media_hours', label: 'Social media hours', help: 'How much of phone time is spent on social media apps.' },
  { value: 'sleep_hours', label: 'Sleep hours', help: 'Nightly sleep duration in hours.' },
];

// Curated relationship (scatter) options
const RELATIONSHIP_OPTIONS = [
  { id: 'phone_vs_prod', x: 'phone_usage_hours', y: 'productivity_score', label: 'Phone hours vs productivity', help: 'Do heavier phone users tend to be more or less productive?' },
  { id: 'study_vs_prod', x: 'study_hours_per_day', y: 'productivity_score', label: 'Study hours vs productivity', help: 'Do students who study more per day achieve higher productivity scores?' },
  { id: 'sleep_vs_prod', x: 'sleep_hours', y: 'productivity_score', label: 'Sleep vs productivity', help: 'Is better sleep linked to feeling more productive?' },
  { id: 'focus_vs_prod', x: 'focus_score', y: 'productivity_score', label: 'Focus vs productivity', help: 'Does a higher focus score go along with higher productivity?' },
  { id: 'stress_vs_prod', x: 'stress_level', y: 'productivity_score', label: 'Stress vs productivity', help: 'Do higher stress levels go along with lower productivity?' },
];

const VIZ_TYPES = [
  { id: 'correlation', label: 'Correlation Map', endpoint: '/api/viz/correlation' },
  { id: 'occupation', label: 'By Gender', endpoint: '/api/viz/occupation-analysis' },
  { id: 'device', label: 'By Stress Band', endpoint: '/api/viz/device-comparison' },
] as const;

const VIZ_DESCRIPTIONS: Record<string, string> = {
  correlation: 'See which features move together (e.g., study hours vs productivity).',
  occupation: 'Compare Average Productivity and Study Hours by Gender.',
  device: 'Compare Average Productivity and Sleep Hours across Stress Bands.',
};

const STEP_IDS = ['dataset', 'stats', 'viz', 'models', 'predict'] as const;
type StepId = (typeof STEP_IDS)[number];

const stepCompletion: Record<StepId, boolean> = {
  dataset: false, stats: false, viz: false, models: false, predict: false,
};

// Chart management to prevent canvas reuse errors
const chartInstances: Record<string, Chart> = {};

function destroyChart(canvasId: string) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

function renderChart(canvasId: string, config: any) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (canvas) {
    chartInstances[canvasId] = new Chart(canvas, config);
  }
}

function markStepCompletion(stepId: StepId, completed: boolean): void {
  stepCompletion[stepId] = completed;
}

function isStepCompleted(stepId: StepId): boolean {
  return stepCompletion[stepId];
}

function $(sel: string, parent?: ParentNode): HTMLElement | null {
  return (parent ?? document).querySelector(sel);
}

function setStepStatus(stepId: string, status: StepStatus): void {
  const header = $(`[data-step="${stepId}"] .step-header`);
  if (!header) return;

  const statusEl = header.querySelector('.step-status');
  if (statusEl) {
    let visualStatus: 'pending' | 'done' | 'error' =
      status === 'done' ? 'done' : status === 'error' ? 'error' : 'pending';
    statusEl.className = `step-status ${visualStatus}`;
    statusEl.textContent =
      visualStatus === 'done' ? 'Done' : visualStatus === 'error' ? 'Error' : 'Pending';
  }

  if (status === 'done') markStepCompletion(stepId as StepId, true);
  else if (status === 'pending') markStepCompletion(stepId as StepId, false);
}

function resetStep(stepId: string): void {
  setStepStatus(stepId, 'pending');
  const container = $(`[data-step="${stepId}"] .step-content`);
  if (container) {
    if (stepId === 'stats') {
      const el = container.querySelector('#stats-container'); if(el) el.innerHTML = '';
    } else if (stepId === 'viz') {
      const el = container.querySelector('#viz-container'); if(el) el.innerHTML = '<p class="viz-placeholder">Choose a visualization</p>';
    } else if (stepId === 'models') {
      const el = container.querySelector('#models-container'); if(el) el.innerHTML = '';
    } else if (stepId === 'predict') {
      container.querySelector('#productivity-result')!.classList.remove('show');
      container.querySelector('#stress-result')!.classList.remove('show');
    }
  }
}



function resetDependentSteps(): void {
  resetStep('stats');
  resetStep('viz');
  resetStep('models');
  resetStep('predict');
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
    { label: 'Avg Productivity', value: s.productivity_score?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Stress', value: s.stress_level?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Study Hrs', value: s.study_hours_per_day?.mean.toFixed(2) ?? '-' },
    { label: 'Avg Sleep Hrs', value: s.sleep_hours?.mean.toFixed(2) ?? '-' },
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
    const accPct = (perf.stress_model.accuracy * 100).toFixed(2);
    cards.push(`
      <div class="metric-card">
        <h4>${perf.stress_model.type}</h4>
        <p><strong>Accuracy:</strong> ${accPct}%</p>
      </div>
    `);
  }
  return cards.length ? cards.join('') : '<p>No model metrics</p>';
}

function getColor(value: number): string {
  // Simple heatmap: -1 (red) -> 0 (white) -> 1 (blue)
  if (value < 0) {
    const intensity = Math.round(255 * (1 - Math.abs(value)));
    return `rgb(255, ${intensity}, ${intensity})`;
  } else {
    const intensity = Math.round(255 * (1 - value));
    return `rgb(${intensity}, ${intensity}, 255)`;
  }
}

function renderCorrelationTable(data: CorrelationData): string {
  const cols = data.columns;
  let html = '<div class="table-responsive" style="max-width: 100%; overflow-x: auto; margin-bottom: 20px;"><table class="corr-table" style="border-collapse: collapse; min-width: 600px; width: 100%;">';
  
  html += '<thead><tr><th style="padding: 10px;"></th>';
  cols.forEach(c => { 
    // Truncate
    const label = c.length > 20 ? c.substring(0, 18)+'...' : c;
    html += `<th style="padding: 10px; font-size: 0.9rem; text-align: center; border-bottom: 2px solid #eee;" title="${c}"><div class="vertical-text" style="writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap;">${label}</div></th>`; 
  });
  html += '</tr></thead><tbody>';

  data.values.forEach((row, i) => {
    html += '<tr>';
    html += `<td style="padding: 10px; font-weight: 600; font-size: 0.9rem; border-right: 2px solid #eee; text-align: right;">${cols[i]}</td>`;
    row.forEach(val => {
      const bg = getColor(val);
      const color = Math.abs(val) > 0.5 ? '#fff' : '#000';
      html += `<td style="padding: 12px; text-align: center; background-color: ${bg}; color: ${color}; font-size: 0.9rem; border: 1px solid #fff;">${val.toFixed(2)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app">
      <header class="header">
        <h1>📱 Smartphone Usage & Productivity Analytics</h1>
        <p>Student Productivity Pipeline — Explore, Visualize, Predict</p>
      </header>

      <div class="pipeline">
        <!-- Step 1: Dataset -->
        <section class="step step--dataset" data-step="dataset">
          <div class="step-header" data-toggle="dataset">
            <span class="step-number">1</span><span class="step-title">Visualize Dataset</span><span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
              <label style="font-weight:600;">Rows:</label>
              <input type="number" id="data-limit" class="row-input" value="100" min="1" max="1000">
              <button class="btn" id="load-dataset">Preview Data</button>
            </div>
            <div class="data-table-wrap" id="dataset-container">
              <p class="viz-placeholder">Choose rows and click "Preview Data".</p>
            </div>
          </div>
        </section>

        <!-- Step 2: Stats -->
        <section class="step step--stats" data-step="stats">
          <div class="step-header" data-toggle="stats">
            <span class="step-number">2</span><span class="step-title">Explore Statistics</span><span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <button class="btn btn-secondary" id="load-stats">Load Statistics</button>
            <div id="stats-container" style="margin-top:16px;"></div>
          </div>
        </section>

        <!-- Step 3: Viz -->
        <section class="step step--viz" data-step="viz">
          <div class="step-header" data-toggle="viz">
            <span class="step-number">3</span><span class="step-title">Visualize (EDA)</span><span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div class="viz-grid">
              <div class="viz-panel">
                <h3 class="panel-title">Quick insights</h3>
                <div class="viz-card-row">
                  ${VIZ_TYPES.map(v => `<button class="viz-card" data-viz="${v.id}"><span class="viz-card-title">${v.label}</span></button>`).join('')}
                </div>
              </div>
              <div class="viz-panel">
                <h3 class="panel-title">Custom explorations</h3>
                <div class="viz-panel-section">
                  <div class="viz-row">
                    <label>Distribution</label>
                    <select id="dist-column">${DIST_OPTIONS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}</select>
                    <button class="btn" id="load-dist">Go</button>
                  </div>
                </div>
                <div class="viz-panel-section">
                  <div class="viz-row">
                    <label>Scatter</label>
                    <select id="scatter-pair">${RELATIONSHIP_OPTIONS.map((p, i) => `<option value="${i}">${p.label}</option>`).join('')}</select>
                    <button class="btn" id="load-scatter">Go</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="viz-container" id="viz-container">
              <p class="viz-placeholder">Choose a visualization.</p>
            </div>
            <div class="viz-explanation" id="viz-explanation"></div>
          </div>
        </section>

        <!-- Step 4: Models -->
        <section class="step step--models" data-step="models">
          <div class="step-header" data-toggle="models">
            <span class="step-number">4</span><span class="step-title">Model Performance</span><span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <button class="btn btn-secondary" id="load-models">Load Metrics</button>
            <div class="model-metrics" id="models-container" style="margin-top:16px;"></div>
          </div>
        </section>

        <!-- Step 5: Predict -->
        <section class="step step--predict" data-step="predict">
          <div class="step-header" data-toggle="predict">
            <span class="step-number">5</span><span class="step-title">Make Predictions</span><span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
             <div style="margin-bottom:24px;">
              <h4 style="margin-bottom:12px;">Productivity Prediction</h4>
              <form id="productivity-form" class="form-grid">
                <div class="form-group"><label>Age</label><input type="number" name="age" min="16" max="60" value="22" required></div>
                <div class="form-group"><label>Gender</label><select name="gender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div class="form-group"><label>Study Hrs / Day</label><input type="number" name="study_hours_per_day" step="0.1" value="4" required></div>
                <div class="form-group"><label>Sleep Hrs</label><input type="number" name="sleep_hours" step="0.1" value="7" required></div>
                <div class="form-group"><label>Phone Usage Hrs</label><input type="number" name="phone_usage_hours" step="0.1" value="5" required></div>
                <div class="form-group"><label>Social Media Hrs</label><input type="number" name="social_media_hours" step="0.1" value="2" required></div>
                <div class="form-group"><label>YouTube Hrs</label><input type="number" name="youtube_hours" step="0.1" value="1" required></div>
                <div class="form-group"><label>Gaming Hrs</label><input type="number" name="gaming_hours" step="0.1" value="1" required></div>
                <div class="form-group"><label>Breaks / Day</label><input type="number" name="breaks_per_day" step="1" value="5" required></div>
                <div class="form-group"><label>Coffee Intake (mg)</label><input type="number" name="coffee_intake_mg" step="10" value="200" required></div>
                <div class="form-group"><label>Exercise Minutes</label><input type="number" name="exercise_minutes" step="5" value="30" required></div>
                <div class="form-group"><label>Assignments Completed</label><input type="number" name="assignments_completed" step="1" value="5" required></div>
                <div class="form-group"><label>Attendance %</label><input type="number" name="attendance_percentage" step="0.1" value="80" required></div>
                <div class="form-group"><label>Stress (1-10)</label><input type="number" name="stress_level" min="1" max="10" value="5" required></div>
              </form>
              <button type="submit" form="productivity-form" class="btn btn-success">Predict Productivity</button>
            </div>
            <div id="productivity-result" class="result-box"></div>

            <div style="margin-top:32px;">
              <h4 style="margin-bottom:12px;">Stress Prediction</h4>
              <form id="stress-form" class="form-grid">
                <div class="form-group"><label>Age</label><input type="number" name="age" min="16" max="60" value="22" required></div>
                <div class="form-group"><label>Gender</label><select name="gender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div class="form-group"><label>Study Hrs / Day</label><input type="number" name="study_hours_per_day" step="0.1" value="4" required></div>
                <div class="form-group"><label>Sleep Hrs</label><input type="number" name="sleep_hours" step="0.1" value="7" required></div>
                <div class="form-group"><label>Phone Usage Hrs</label><input type="number" name="phone_usage_hours" step="0.1" value="5" required></div>
                <div class="form-group"><label>Social Media Hrs</label><input type="number" name="social_media_hours" step="0.1" value="2" required></div>
                <div class="form-group"><label>YouTube Hrs</label><input type="number" name="youtube_hours" step="0.1" value="1" required></div>
                <div class="form-group"><label>Gaming Hrs</label><input type="number" name="gaming_hours" step="0.1" value="1" required></div>
                <div class="form-group"><label>Breaks / Day</label><input type="number" name="breaks_per_day" step="1" value="5" required></div>
                <div class="form-group"><label>Coffee Intake (mg)</label><input type="number" name="coffee_intake_mg" step="10" value="200" required></div>
                <div class="form-group"><label>Exercise Minutes</label><input type="number" name="exercise_minutes" step="5" value="30" required></div>
                <div class="form-group"><label>Assignments Completed</label><input type="number" name="assignments_completed" step="1" value="5" required></div>
                <div class="form-group"><label>Attendance %</label><input type="number" name="attendance_percentage" step="0.1" value="80" required></div>
                <div class="form-group"><label>Productivity Score</label><input type="number" name="productivity_score" step="0.1" value="50" required></div>
              </form>
              <button type="submit" form="stress-form" class="btn btn-success">Predict Stress</button>
            </div>
            <div id="stress-result" class="result-box"></div>
          </div>
        </section>
      </div>
      
       <div class="wizard-nav">
        <button class="btn btn-secondary" id="prev-step">← Previous</button>
        <div class="wizard-status" id="wizard-status"></div>
        <button class="btn btn-success" id="next-step">Next →</button>
      </div>
    </div>
  `;

  // Wizard state & Navigation (kept similar to before)
  let currentStepIndex = 0;
  function updateStepVisibility() {
    STEP_IDS.forEach((id, index) => {
      const section = document.querySelector(`section[data-step="${id}"]`) as HTMLElement;
      if (section) section.style.display = index === currentStepIndex ? 'block' : 'none';
    });
    const statusEl = document.getElementById('wizard-status');
    if (statusEl) statusEl.textContent = `Step ${currentStepIndex + 1} of ${STEP_IDS.length}: ${document.querySelector(`section[data-step="${STEP_IDS[currentStepIndex]}"] .step-title`)?.textContent}`;
    
    const prevBtn = document.getElementById('prev-step') as HTMLButtonElement;
    if (prevBtn) {
      prevBtn.disabled = currentStepIndex === 0;
      prevBtn.style.visibility = currentStepIndex === 0 ? 'hidden' : 'visible';
    }
    const nextBtn = document.getElementById('next-step') as HTMLButtonElement;
    if (nextBtn) {
      const isLast = currentStepIndex === STEP_IDS.length - 1;
      nextBtn.textContent = isLast ? 'Finish' : 'Next →';
      if (currentStepIndex === 0 && !isStepCompleted('dataset')) nextBtn.disabled = true;
      else nextBtn.disabled = false;
    }
  }
  updateStepVisibility();
  
  document.getElementById('prev-step')?.addEventListener('click', () => { if (currentStepIndex > 0) { currentStepIndex--; updateStepVisibility(); } });
  document.getElementById('next-step')?.addEventListener('click', () => { 
    if (currentStepIndex < STEP_IDS.length - 1) { 
      currentStepIndex++; 
      updateStepVisibility(); 
    } else {
      // Finish Page
      root.innerHTML = `
        <div class="app" style="text-align: center; padding-top: 50px;">
          <header class="header">
            <h1>🎉 Analysis Complete!</h1>
            <p>You have successfully explored the dataset, visualized trends, and generated predictions.</p>
          </header>
          <div style="background: #e0f2fe; border: 4px solid #0a0a0a; padding: 40px; max-width: 600px; margin: 0 auto; box-shadow: 6px 6px 0 #0a0a0a;">
             <h3>What's Next?</h3>
             <p style="margin: 20px 0;">You can restart the analysis to explore different variables or make new predictions.</p>
             <button class="btn btn-success" onclick="window.location.reload()">Start New Analysis</button>
          </div>
        </div>
      `;
    }
  });
  
  root.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = (el as HTMLElement).dataset.toggle as StepId;
      if (targetId !== 'dataset' && !isStepCompleted('dataset')) return;
      const idx = STEP_IDS.indexOf(targetId);
      if (idx >= 0) { currentStepIndex = idx; updateStepVisibility(); }
    });
  });

  // HANDLERS
  
  let previousLimit = 100;
  $('#load-dataset')?.addEventListener('click', async () => {
    const limit = Number(($('#data-limit') as HTMLInputElement).value);
    setStepStatus('dataset', 'loading');
    try {
      const data = await api.fetchSampleData(limit);
      $('#dataset-container')!.innerHTML = renderDataTable(data);
      setStepStatus('dataset', 'done');
      updateStepVisibility();
      if (limit !== previousLimit && previousLimit !== 100) resetDependentSteps();
      previousLimit = limit;
    } catch (e) { setStepStatus('dataset', 'error'); $('#dataset-container')!.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
  });

  $('#load-stats')?.addEventListener('click', async () => {
    setStepStatus('stats', 'loading');
    try {
      const stats = await api.fetchDataStats();
      $('#stats-container')!.innerHTML = `<div class="stats-grid">${renderStats(stats)}</div>`;
      setStepStatus('stats', 'done');
    } catch (e) { setStepStatus('stats', 'error'); $('#stats-container')!.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
  });

  $('#load-models')?.addEventListener('click', async () => {
    setStepStatus('models', 'loading');
    try {
       const perf = await api.fetchModelPerformance();
       $('#models-container')!.innerHTML = renderModelMetrics(perf);
       setStepStatus('models', 'done');
    } catch(e) { setStepStatus('models', 'error'); $('#models-container')!.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
  });

  // PREDICTION HANDLERS
  $('#productivity-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const params: ProductivityParams = {
      age: Number(fd.get('age')),
      gender: String(fd.get('gender')),
      study_hours_per_day: Number(fd.get('study_hours_per_day')),
      social_media_hours: Number(fd.get('social_media_hours')),
      sleep_hours: Number(fd.get('sleep_hours')),
      phone_usage_hours: Number(fd.get('phone_usage_hours')),
      youtube_hours: Number(fd.get('youtube_hours')),
      gaming_hours: Number(fd.get('gaming_hours')),
      breaks_per_day: Number(fd.get('breaks_per_day')),
      coffee_intake_mg: Number(fd.get('coffee_intake_mg')),
      exercise_minutes: Number(fd.get('exercise_minutes')),
      assignments_completed: Number(fd.get('assignments_completed')),
      attendance_percentage: Number(fd.get('attendance_percentage')),
      stress_level: Number(fd.get('stress_level')),
    };
    setStepStatus('predict', 'loading');
    try {
      const res = await api.predictProductivity(params);
      const box = $('#productivity-result');
      if (box) {
        box.innerHTML = `<h4>Prediction</h4><div class="prediction-value">${res.predicted_productivity.toFixed(2)}</div><p>Predicted productivity score</p>`;
        box.classList.add('show');
      }
      setStepStatus('predict', 'done');
    } catch(err) {
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
      study_hours_per_day: Number(fd.get('study_hours_per_day')),
      social_media_hours: Number(fd.get('social_media_hours')),
      sleep_hours: Number(fd.get('sleep_hours')),
      phone_usage_hours: Number(fd.get('phone_usage_hours')),
      youtube_hours: Number(fd.get('youtube_hours')),
      gaming_hours: Number(fd.get('gaming_hours')),
      breaks_per_day: Number(fd.get('breaks_per_day')),
      coffee_intake_mg: Number(fd.get('coffee_intake_mg')),
      exercise_minutes: Number(fd.get('exercise_minutes')),
      assignments_completed: Number(fd.get('assignments_completed')),
      attendance_percentage: Number(fd.get('attendance_percentage')),
      productivity_score: Number(fd.get('productivity_score')),
    };
    setStepStatus('predict', 'loading');
    try {
      const res = await api.predictStress(params);
      const box = $('#stress-result');
      if (box) {
        box.innerHTML = `<h4>Prediction</h4><div class="prediction-value">${(res as any).predicted_stress_band}</div><p>Predicted stress band</p>`;
        box.classList.add('show');
      }
      setStepStatus('predict', 'done');
    } catch(err) {
      setStepStatus('predict', 'error');
      const box = $('#stress-result');
      if (box) {
        box.innerHTML = `<div class="error">${(err as Error).message}</div>`;
        box.classList.add('show');
      }
    }
  });

  // VIZ HANDLERS - CHART.JS Implementation

  // Quick Insights Buttons
  root.querySelectorAll('[data-viz]').forEach(btn => {
    btn.addEventListener('click', async () => {
      setStepStatus('viz', 'loading');
      const vizId = (btn as HTMLElement).dataset.viz;
      const container = $('#viz-container')!;
      // Clear container and add canvas
      container.innerHTML = `<canvas id="viz-canvas" style="max-height:500px;"></canvas>`;
      
      try {
        if (vizId === 'correlation') {
          // Correlation is a table for this implementation
          const data = await api.fetchVizData<CorrelationData>('/api/viz/correlation');
          container.innerHTML = renderCorrelationTable(data);
        } else if (vizId === 'occupation') {
          const data = await api.fetchVizData<OccupationAnalysisData>('/api/viz/occupation-analysis');
          renderChart('viz-canvas', {
            type: 'bar',
            data: {
              labels: data.categories,
              datasets: [
                { label: data.labels[0], data: data.series1, backgroundColor: 'rgba(75, 192, 192, 0.7)', yAxisID: 'y' },
                { label: data.labels[1], data: data.series2, backgroundColor: 'rgba(153, 102, 255, 0.7)', yAxisID: 'y1' }
              ]
            },
            options: {
              responsive: true,
              scales: {
                y: { type: 'linear', display: true, position: 'left', title: {display: true, text: data.labels[0]} },
                y1: { type: 'linear', display: true, position: 'right', grid: {drawOnChartArea: false}, title: {display: true, text: data.labels[1]} },
              }
            }
          });
        } else if (vizId === 'device') {
          const data = await api.fetchVizData<DeviceComparisonData>('/api/viz/device-comparison');
          renderChart('viz-canvas', {
             type: 'bar',
             data: {
               labels: data.categories,
               datasets: [
                 { label: data.labels[0], data: data.series1, backgroundColor: 'rgba(54, 162, 235, 0.7)', yAxisID: 'y' },
                 { label: data.labels[1], data: data.series2, backgroundColor: 'rgba(255, 206, 86, 0.7)', yAxisID: 'y1' }
               ]
             },
             options: {
               responsive: true,
               scales: {
                  y: { position: 'left', title: {display: true, text: data.labels[0]} },
                  y1: { position: 'right', grid: {drawOnChartArea: false}, title: {display: true, text: data.labels[1]} }
               }
             }
          });
        }
        setStepStatus('viz', 'done');
        const expl = $('#viz-explanation'); if (expl) expl.textContent = VIZ_DESCRIPTIONS[vizId!] ?? '';
      } catch(e) { setStepStatus('viz', 'error'); container.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
    });
  });

  // Custom Distribution
  $('#load-dist')?.addEventListener('click', async () => {
    setStepStatus('viz', 'loading');
    const selectEl = $('#dist-column') as HTMLSelectElement;
    const value = selectEl.value;
    const option = DIST_OPTIONS.find(o => o.value === value) ?? DIST_OPTIONS[0];
    const container = $('#viz-container')!;
    // Optimized layout: Stats wider (3:2 ratio), fixed height
    container.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap: 20px; min-height: 400px;">
            <div style="flex: 3 1 0; min-width: 300px; height: 400px;"><canvas id="dist-canvas"></canvas></div>
            <div class="stats-box" id="dist-stats" style="flex: 2 1 0; min-width: 250px; height: 400px; overflow-y: auto; background: #fafafa; border: 2px solid #0a0a0a; padding: 20px; box-shadow: 4px 4px 0 #0a0a0a;"></div>
        </div>`;

    try {
      const data = await api.fetchVizData<DistributionData>(`/api/viz/distribution/${encodeURIComponent(value)}`);
      
      // Render Histogram
      // Bin edges are [e0, e1, e2...] - we use label as "e0-e1"
      const labels = [];
      for(let i=0; i<data.histogram.bin_edges.length-1; i++) {
          labels.push(`${data.histogram.bin_edges[i].toFixed(1)} - ${data.histogram.bin_edges[i+1].toFixed(1)}`);
      }

      renderChart('dist-canvas', {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
             label: 'Frequency',
             data: data.histogram.counts,
             backgroundColor: 'rgba(54, 162, 235, 0.6)',
             borderColor: 'rgba(54, 162, 235, 1)',
             borderWidth: 1,
             barPercentage: 1.0,
             categoryPercentage: 1.0
          }]
        },
        options: {
           responsive: true,
           maintainAspectRatio: false,
           animation: false as const, // Disable animation to prevent "coming from left/right" effect
           plugins: { legend: {display: false}, title: {display: true, text: `Distribution of ${option.label}`} },
           scales: { x: { ticks: { maxTicksLimit: 10 } } }
        }
      });

      // Render Stats
      const statsHtml = `
         <h4>Stats</h4>
         <p><strong>Min:</strong> ${data.boxplot.min.toFixed(2)}</p>
         <p><strong>Q1:</strong> ${data.boxplot.q1.toFixed(2)}</p>
         <p><strong>Median:</strong> ${data.boxplot.median.toFixed(2)}</p>
         <p><strong>Q3:</strong> ${data.boxplot.q3.toFixed(2)}</p>
         <p><strong>Max:</strong> ${data.boxplot.max.toFixed(2)}</p>
      `;
      $('#dist-stats')!.innerHTML = statsHtml;
      
      setStepStatus('viz', 'done');
      const expl = $('#viz-explanation'); if (expl) expl.textContent = option.help;
    } catch(e) { setStepStatus('viz', 'error'); container.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
  });

  // Custom Scatter
  $('#load-scatter')?.addEventListener('click', async () => {
    setStepStatus('viz', 'loading');
    const idx = Number(($('#scatter-pair') as HTMLSelectElement).value);
    const pair = RELATIONSHIP_OPTIONS[idx];
    const container = $('#viz-container')!;
    container.innerHTML = `<div style="height: 500px; width: 100%;"><canvas id="scatter-canvas"></canvas></div>`;

    try {
      const data = await api.fetchVizData<ScatterData>(`/api/viz/scatter/${encodeURIComponent(pair.x)}/${encodeURIComponent(pair.y)}`);
      
      // Trend line points: need two points [min_x, prediction_at_min_x], [max_x, prediction_at_max_x]
      const minX = data.trend_line.min_x;
      const maxX = data.trend_line.max_x;
      const minY = data.trend_line.slope * minX + data.trend_line.intercept;
      const maxY = data.trend_line.slope * maxX + data.trend_line.intercept;

      renderChart('scatter-canvas', {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Students',
              data: data.points,
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
              type: 'line',
              label: 'Trend Line',
              data: [{x: minX, y: minY}, {x: maxX, y: maxY}],
              borderColor: 'red',
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
             duration: 1000,
             easing: 'easeOutQuart'
          },
          plugins: { title: {display: true, text: `${pair.label}`} },
          scales: {
             x: { type: 'linear', position: 'bottom', title: {display: true, text: pair.x} },
             y: { title: {display: true, text: pair.y} }
          }
        }
      });
      setStepStatus('viz', 'done');
      const expl = $('#viz-explanation'); if (expl) expl.textContent = pair.help;
    } catch(e) { setStepStatus('viz', 'error'); container.innerHTML = `<div class="error">${(e as Error).message}</div>`; }
  });
}
