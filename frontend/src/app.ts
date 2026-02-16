import * as api from './api/client';
import type { DataStats, ModelPerformance, ProductivityParams, StressParams } from './types/api';

type StepStatus = 'pending' | 'loading' | 'done' | 'error';

// Curated distribution options for the student productivity dataset
const DIST_OPTIONS = [
  {
    value: 'productivity_score',
    label: 'Productivity score',
    help: 'Overall productivity score for each student.',
  },
  {
    value: 'stress_level',
    label: 'Stress level (1–10)',
    help: 'Self‑reported stress levels across all students.',
  },
  {
    value: 'study_hours_per_day',
    label: 'Study hours per day',
    help: 'How many hours per day students spend studying.',
  },
  {
    value: 'phone_usage_hours',
    label: 'Daily phone usage hours',
    help: 'Total hours spent on the phone in a typical day.',
  },
  {
    value: 'social_media_hours',
    label: 'Social media hours',
    help: 'How much of phone time is spent on social media apps.',
  },
  {
    value: 'sleep_hours',
    label: 'Sleep hours',
    help: 'Nightly sleep duration in hours.',
  },
];

// Curated relationship (scatter) options
const RELATIONSHIP_OPTIONS = [
  {
    id: 'phone_vs_prod',
    x: 'phone_usage_hours',
    y: 'productivity_score',
    label: 'Phone hours vs productivity',
    help: 'Do heavier phone users tend to be more or less productive?',
  },
  {
    id: 'study_vs_prod',
    x: 'study_hours_per_day',
    y: 'productivity_score',
    label: 'Study hours vs productivity',
    help: 'Do students who study more per day achieve higher productivity scores?',
  },
  {
    id: 'sleep_vs_prod',
    x: 'sleep_hours',
    y: 'productivity_score',
    label: 'Sleep vs productivity',
    help: 'Is better sleep linked to feeling more productive?',
  },
  {
    id: 'focus_vs_prod',
    x: 'focus_score',
    y: 'productivity_score',
    label: 'Focus vs productivity',
    help: 'Does a higher focus score go along with higher productivity?',
  },
  {
    id: 'stress_vs_prod',
    x: 'stress_level',
    y: 'productivity_score',
    label: 'Stress vs productivity',
    help: 'Do higher stress levels go along with lower productivity?',
  },
];

const VIZ_TYPES = [
  { id: 'correlation', label: 'Correlation Map', endpoint: '/api/viz/correlation' },
  { id: 'occupation', label: 'By Gender', endpoint: '/api/viz/occupation-analysis' },
  { id: 'device', label: 'By Stress Band', endpoint: '/api/viz/device-comparison' },
] as const;

const VIZ_DESCRIPTIONS: Record<string, string> = {
  correlation:
    'See which study, sleep, phone, and focus features move together (e.g., study hours vs productivity).',
  occupation:
    'See how coffee intake and exercise minutes differ across genders.',
  device:
    'See how productivity and coffee intake change across low / medium / high stress bands.',
};

const STEP_IDS = ['dataset', 'stats', 'viz', 'models', 'predict'] as const;
type StepId = (typeof STEP_IDS)[number];

const stepCompletion: Record<StepId, boolean> = {
  dataset: false,
  stats: false,
  viz: false,
  models: false,
  predict: false,
};

function markStepCompletion(stepId: StepId, completed: boolean): void {
  stepCompletion[stepId] = completed;
}

function isStepCompleted(stepId: StepId): boolean {
  return stepCompletion[stepId];
}

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

  // Track completion state so navigation and other steps can gate correctly
  if (status === 'done') {
    markStepCompletion(stepId as StepId, true);
  } else if (status === 'pending') {
    markStepCompletion(stepId as StepId, false);
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

export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app">
      <header class="header">
        <h1>📱 Smartphone Usage & Productivity Analytics</h1>
        <p>Student Productivity Pipeline — Explore, Visualize, Predict</p>
      </header>

      <div class="pipeline">
        <!-- Step 1: Visualize Dataset -->
        <section class="step step--dataset" data-step="dataset">
          <div class="step-header" data-toggle="dataset">
            <span class="step-number">1</span>
            <span class="step-title">Visualize Dataset</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
              <label style="font-weight:600;">Rows to preview:</label>
              <input type="number" id="data-limit" class="row-input" value="100" min="1" max="1000">
              <button class="btn" id="load-dataset">Preview Data</button>
            </div>
            <div class="data-table-wrap" id="dataset-container">
              <p class="viz-placeholder">
                Choose how many rows to preview and click "Preview Data".
                Models are always trained on the full dataset.
              </p>
            </div>
          </div>
        </section>

        <!-- Step 2: Statistics -->
        <section class="step step--stats" data-step="stats">
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
        <section class="step step--viz" data-step="viz">
          <div class="step-header" data-toggle="viz">
            <span class="step-number">3</span>
            <span class="step-title">Visualize (EDA)</span>
            <span class="step-status pending">Pending</span>
          </div>
          <div class="step-content">
            <div class="viz-grid">
              <div class="viz-panel">
                <h3 class="panel-title">Quick insights</h3>
                <p class="panel-help">Start with a high-level overview of your data.</p>
                <div class="viz-card-row">
                  ${VIZ_TYPES.map(
                    v => `
                    <button class="viz-card" data-viz="${v.endpoint}">
                      <span class="viz-card-title">${v.label}</span>
                      <span class="viz-card-subtitle">${VIZ_DESCRIPTIONS[v.id]}</span>
                    </button>`,
                  ).join('')}
                </div>
              </div>
              <div class="viz-panel">
                <h3 class="panel-title">Custom explorations</h3>
                <div class="viz-panel-section">
                  <h4 class="panel-section-title">Distribution explorer</h4>
                  <p class="panel-help">Inspect how a single feature is distributed.</p>
                  <div class="viz-row">
                    <label for="dist-column" class="field-label">Column</label>
                    <select id="dist-column">
                      ${DIST_OPTIONS.map(
                        c => `<option value="${c.value}">${c.label}</option>`,
                      ).join('')}
                    </select>
                    <button class="btn" id="load-dist">Show distribution</button>
                  </div>
                </div>
                <div class="viz-panel-section">
                  <h4 class="panel-section-title">Relationship explorer</h4>
                  <p class="panel-help">See how two related features move together.</p>
                  <div class="viz-row">
                    <label for="scatter-pair" class="field-label">Relationship</label>
                    <select id="scatter-pair">
                      ${RELATIONSHIP_OPTIONS.map(
                        (p, i) => `<option value="${i}">${p.label}</option>`,
                      ).join('')}
                    </select>
                    <button class="btn" id="load-scatter">Show scatter</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="viz-container" id="viz-container">
              <p class="viz-placeholder">Choose a quick insight or custom exploration.</p>
            </div>
            <div class="viz-explanation" id="viz-explanation"></div>
          </div>
        </section>

        <!-- Step 4: Model Performance -->
        <section class="step step--models" data-step="models">
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
        <section class="step step--predict" data-step="predict">
          <div class="step-header" data-toggle="predict">
            <span class="step-number">5</span>
            <span class="step-title">Make Predictions</span>
            <span class="step-status pending">Pending</span>
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

  // Wizard state
  let currentStepIndex = 0;

  function updateStepVisibility() {
    STEP_IDS.forEach((id, index) => {
      const section = document.querySelector(`section[data-step="${id}"]`) as HTMLElement | null;
      if (section) {
        section.style.display = index === currentStepIndex ? 'block' : 'none';
      }
    });

    const statusEl = document.getElementById('wizard-status');
    if (statusEl) {
      statusEl.textContent = `Step ${currentStepIndex + 1} of ${STEP_IDS.length}: ${
        document.querySelector(
          `section[data-step="${STEP_IDS[currentStepIndex]}"] .step-title`,
        )?.textContent ?? ''
      }`;
    }

    const prevBtn = document.getElementById('prev-step') as HTMLButtonElement | null;
    const nextBtn = document.getElementById('next-step') as HTMLButtonElement | null;
    if (prevBtn) {
      const isFirst = currentStepIndex === 0;
      prevBtn.disabled = isFirst;
      prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
    }
    if (nextBtn) {
      const isLast = currentStepIndex === STEP_IDS.length - 1;
      nextBtn.textContent = isLast ? 'Finish' : 'Next →';
      // Do not allow progressing past the dataset step until it's completed
      if (currentStepIndex === 0 && !isStepCompleted('dataset')) {
        nextBtn.disabled = true;
      } else {
        nextBtn.disabled = false;
      }
    }
  }

  updateStepVisibility();

  document.getElementById('prev-step')?.addEventListener('click', () => {
    if (currentStepIndex > 0) {
      currentStepIndex -= 1;
      updateStepVisibility();
    }
  });

  document.getElementById('next-step')?.addEventListener('click', () => {
    if (currentStepIndex < STEP_IDS.length - 1) {
      currentStepIndex += 1;
      updateStepVisibility();
    }
  });

  // Clicking on step headers: treat as navigation, but enforce basic flow
  root.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const targetId = (el as HTMLElement).dataset.toggle as StepId | undefined;
      if (!targetId) return;

      // Do not allow jumping ahead before dataset is loaded
      if (targetId !== 'dataset' && !isStepCompleted('dataset')) {
        const statusEl = document.getElementById('wizard-status');
        if (statusEl) {
          statusEl.textContent =
            'Complete Step 1 (Load Dataset) before jumping to later steps.';
        }
        return;
      }

      const targetIndex = STEP_IDS.indexOf(targetId);
      if (targetIndex >= 0) {
        currentStepIndex = targetIndex;
        updateStepVisibility();
      }
    });
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
      // Re-evaluate navigation state now that the dataset step is complete
      updateStepVisibility();

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
    const selectEl = $('#dist-column') as HTMLSelectElement | null;
    const value = selectEl?.value ?? DIST_OPTIONS[0].value;
    const option = DIST_OPTIONS.find(o => o.value === value) ?? DIST_OPTIONS[0];
    try {
      const img = await api.fetchVizImage(
        `/api/viz/distribution/${encodeURIComponent(option.value)}`,
      );
      const container = $('#viz-container');
      if (container)
        container.innerHTML = `<img src="data:image/png;base64,${img}" alt="Distribution of ${option.label}">`;
      const expl = $('#viz-explanation');
      if (expl) expl.textContent = option.help;
      setStepStatus('viz', 'done', true);
    } catch (e) {
      setStepStatus('viz', 'error');
      const container = $('#viz-container');
      if (container)
        container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
      const expl = $('#viz-explanation');
      if (expl) expl.textContent = '';
    }
  });

  $('#load-scatter')?.addEventListener('click', async () => {
    setStepStatus('viz', 'loading');
    const selectEl = $('#scatter-pair') as HTMLSelectElement | null;
    const idx = Number(selectEl?.value ?? 0);
    const pair = RELATIONSHIP_OPTIONS[idx] ?? RELATIONSHIP_OPTIONS[0];
    try {
      const img = await api.fetchVizImage(
        `/api/viz/scatter/${encodeURIComponent(pair.x)}/${encodeURIComponent(pair.y)}`,
      );
      const container = $('#viz-container');
      if (container)
        container.innerHTML = `<img src="data:image/png;base64,${img}" alt="${pair.label}">`;
      const expl = $('#viz-explanation');
      if (expl) expl.textContent = pair.help;
      setStepStatus('viz', 'done', true);
    } catch (e) {
      setStepStatus('viz', 'error');
      const container = $('#viz-container');
      if (container)
        container.innerHTML = `<div class="error">${(e as Error).message}</div>`;
      const expl = $('#viz-explanation');
      if (expl) expl.textContent = '';
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
        box.innerHTML = `<h4>Prediction</h4><div class="prediction-value">${(res as any).predicted_stress_band}</div><p>Predicted stress band (low / medium / high)</p>`;
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
