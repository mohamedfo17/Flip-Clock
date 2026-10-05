// Main Application Bootstrap
import { FlipDigitPair, FlipCard } from './components/flip-unit.js';
import { TimerController } from './components/timer-controller.js';
import { soundEngine } from './audio/sound-engine.js';
import { TaskManager } from './components/task-manager.js';
import { AnalyticsManager } from './components/analytics.js';
import { BreakReminder } from './components/break-reminder.js';

// DOM Elements
const hoursContainer = document.getElementById('unit-hours');
const minutesContainer = document.getElementById('unit-minutes');
const secondsContainer = document.getElementById('unit-seconds');
const secondsSep = document.getElementById('sep-ms');
const meridiemCardEl = document.getElementById('meridiem-card');

const navModes = document.getElementById('nav-modes');
const stageControls = document.getElementById('stage-controls');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');
const btnTimerSkip = document.getElementById('btn-timer-skip');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');

const pomoPhaseIndicator = document.getElementById('pomo-phase-indicator');
const pomoPhaseLabel = document.getElementById('pomo-phase-label');
const pomoCyclesDots = document.getElementById('pomo-cycles-dots');

const activeTaskBanner = document.getElementById('active-task-banner');
const activeTaskDisplay = document.getElementById('active-task-display');
const activeTaskPomoCount = document.getElementById('active-task-pomo-count');

// Drawer Elements
const drawerPanel = document.getElementById('drawer-panel');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerTitle = document.getElementById('drawer-title');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const dockButtons = document.querySelectorAll('.dock-btn[data-drawer]');

// Tasks Elements
const tasksListContainer = document.getElementById('tasks-list');
const newTaskTitle = document.getElementById('new-task-title');
const newTaskEst = document.getElementById('new-task-est');
const btnAddTask = document.getElementById('btn-add-task');

// Audio & Mute Elements
const btnMasterMute = document.getElementById('btn-master-mute');
const toggleMasterMute = document.getElementById('toggle-master-mute');
const iconVolumeOn = btnMasterMute?.querySelector('.icon-volume-on');
const iconVolumeMuted = btnMasterMute?.querySelector('.icon-volume-muted');
const toggleFlapAudio = document.getElementById('toggle-flap-audio');
const toggleTickAudio = document.getElementById('toggle-tick-audio');
const ambientToggles = document.querySelectorAll('.track-toggle[data-ambient]');
const ambientSliders = document.querySelectorAll('.track-slider[data-ambient-slider]');

// Deep Analytics Drawer Elements
const goalProgressText = document.getElementById('goal-progress-text');
const goalBarFill = document.getElementById('goal-bar-fill');
const statFocusTime = document.getElementById('stat-focus-time');
const statPomoCount = document.getElementById('stat-pomo-count');
const statStreak = document.getElementById('stat-streak');
const statAllTime = document.getElementById('stat-all-time');
const heatmapGrid = document.getElementById('heatmap-grid');
const analyticsChartBars = document.getElementById('analytics-chart-bars');
const peakHourBadge = document.getElementById('peak-hour-badge');
const timeOfDayList = document.getElementById('time-of-day-list');
const taskAllocationList = document.getElementById('task-allocation-list');
const sessionHistoryList = document.getElementById('session-history-list');
const btnLoadSampleAnalytics = document.getElementById('btn-load-sample-analytics');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnExportJson = document.getElementById('btn-export-json');

// Settings Elements
const presetPills = document.querySelectorAll('.preset-pill');
const toggleBlankLeadingZero = document.getElementById('toggle-blank-leading-zero');
const toggleAutostartBreaks = document.getElementById('toggle-autostart-breaks');
const toggle24hClock = document.getElementById('toggle-24h-clock');
const toggleShowSeconds = document.getElementById('toggle-show-seconds');
const toggleBreakPrompts = document.getElementById('toggle-break-prompts');

// Break Modal Elements
const breakOverlay = document.getElementById('break-overlay');
const btnBreakDone = document.getElementById('btn-break-done');
const btnBreakSkip = document.getElementById('btn-break-skip');

// Window Action Buttons
const btnMinimize = document.getElementById('btn-minimize');
const btnMaximize = document.getElementById('btn-maximize');
const btnClose = document.getElementById('btn-close');
const btnFullscreenHeader = document.getElementById('btn-fullscreen-header');
const dockBtnFullscreen = document.getElementById('dock-btn-fullscreen');
const btnMiniMode = document.getElementById('btn-mini-mode');

// --- Component Initialization ---
const hoursPair = new FlipDigitPair(hoursContainer, '00');
const minutesPair = new FlipDigitPair(minutesContainer, '00');
const secondsPair = new FlipDigitPair(secondsContainer, '00');
const meridiemCard = new FlipCard(meridiemCardEl, 'PM');

let enableBreakPrompts = true;
let blankLeadingZero = true; // Displays blank card for 1-9 (e.g. [ ][9]:[3][0][PM])
let currentWindowMode = 'standard';

// Data Persistence Helper
async function loadStoredData() {
  if (window.electronAPI) {
    const data = await window.electronAPI.loadData();
    if (data) return data;
  }
  try {
    const local = localStorage.getItem('flip_clock_data');
    return local ? JSON.parse(local) : null;
  } catch (e) {
    return null;
  }
}

async function saveStoredData(data) {
  if (window.electronAPI) {
    await window.electronAPI.saveData(data);
  }
  try {
    localStorage.setItem('flip_clock_data', JSON.stringify(data));
  } catch (e) {}
}

let appState = {
  tasks: [],
  analytics: {},
  settings: {
    clock24h: false,
    blankLeadingZero: true,
    showSeconds: false, // Default to clean 4-card layout matching user reference
    flapSound: true,
    tickSound: false,
    autoStartBreaks: true,
    breakPrompts: true,
    pomodoroPreset: { focus: 25, break: 5 }
  }
};

let taskManager = null;
let analyticsManager = null;
let breakReminder = null;
let timerController = null;

async function initApp() {
  const loaded = await loadStoredData();
  if (loaded) {
    appState = { ...appState, ...loaded };
    if (loaded.settings) appState.settings = { ...appState.settings, ...loaded.settings };
  }

  // Analytics Manager
  analyticsManager = new AnalyticsManager(appState.analytics, (updated) => {
    appState.analytics = updated;
    saveStoredData(appState);
    renderDeepAnalyticsUI();
  });

  // Task Manager
  taskManager = new TaskManager(appState.tasks, (updatedTasks) => {
    appState.tasks = updatedTasks;
    saveStoredData(appState);
    renderTasksUI();
    updateActiveTaskBanner();
    renderDeepAnalyticsUI();
  });

  // Break Reminder
  breakReminder = new BreakReminder(breakOverlay, () => {});

  // Timer Controller
  timerController = new TimerController({
    onTick: handleTimerTick,
    onPhaseComplete: handlePhaseComplete
  });

  // Apply initial settings
  applySettings();

  // Setup Event Listeners
  setupEventListeners();

  // Initial renders
  renderTasksUI();
  updateActiveTaskBanner();
  renderDeepAnalyticsUI();
}

function applySettings() {
  timerController.clock24h = appState.settings.clock24h;
  timerController.showSeconds = appState.settings.showSeconds;
  timerController.autoStartBreaks = appState.settings.autoStartBreaks;
  blankLeadingZero = appState.settings.blankLeadingZero !== false;
  enableBreakPrompts = appState.settings.breakPrompts;

  if (appState.settings.pomodoroPreset) {
    timerController.setPomodoroPreset(
      appState.settings.pomodoroPreset.focus,
      appState.settings.pomodoroPreset.break
    );
  }

  soundEngine.setFlapVolume(appState.settings.flapSound ? 0.5 : 0);
  soundEngine.setTickEnabled(appState.settings.tickSound);

  // Sync settings UI toggles
  toggle24hClock.classList.toggle('on', timerController.clock24h);
  toggleBlankLeadingZero.classList.toggle('on', blankLeadingZero);
  toggleShowSeconds.classList.toggle('on', timerController.showSeconds);
  toggleAutostartBreaks.classList.toggle('on', timerController.autoStartBreaks);
  toggleBreakPrompts.classList.toggle('on', enableBreakPrompts);
  toggleFlapAudio.classList.toggle('on', appState.settings.flapSound);
  toggleTickAudio.classList.toggle('on', appState.settings.tickSound);

  // Initialize Master Mute
  setMasterMute(Boolean(appState.settings.isMuted));
  updateSecondsVisibility();
}

function setMasterMute(muted) {
  appState.settings.isMuted = muted;
  soundEngine.setMuted(muted);
  saveStoredData(appState);
  updateMuteUI();
}

function toggleMasterMuteState() {
  setMasterMute(!appState.settings.isMuted);
}

function updateMuteUI() {
  const isMuted = Boolean(appState.settings.isMuted);
  btnMasterMute?.classList.toggle('muted', isMuted);
  toggleMasterMute?.classList.toggle('on', isMuted);

  if (iconVolumeOn && iconVolumeMuted) {
    iconVolumeOn.style.display = isMuted ? 'none' : 'block';
    iconVolumeMuted.style.display = isMuted ? 'block' : 'none';
  }

  if (btnMasterMute) {
    btnMasterMute.title = isMuted ? 'Unmute All Audio (M)' : 'Mute All Audio (M)';
  }
}

function updateSecondsVisibility() {
  document.body.classList.toggle('has-seconds', Boolean(timerController.showSeconds));
  if (timerController.showSeconds) {
    secondsContainer.classList.remove('hidden');
    secondsSep.classList.remove('hidden');
  } else {
    secondsContainer.classList.add('hidden');
    secondsSep.classList.add('hidden');
  }
}

// Timer Tick Handler
function handleTimerTick(state) {
  let displayHours = state.hours;

  // Blank leading zero on single-digit hour (matches reference image: [ ][9] : [3][0] [PM])
  if (blankLeadingZero && !timerController.clock24h && state.mode === 'clock') {
    if (displayHours.startsWith('0')) {
      displayHours = ' ' + displayHours.slice(1);
    }
  }

  hoursPair.setValue(displayHours);
  minutesPair.setValue(state.minutes);
  if (state.showSeconds) {
    secondsPair.setValue(state.seconds);
  }

  // Update Mini AM/PM Card
  if (state.meridiem) {
    meridiemCard.setValue(state.meridiem);
  }

  // Update Play / Pause Button Icon
  if (state.isRunning) {
    iconPlay.style.display = 'none';
    iconPause.style.display = 'block';
  } else {
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
  }

  // Update Pomodoro Phase Indicator
  if (state.mode === 'pomodoro') {
    pomoPhaseIndicator.style.display = 'flex';
    pomoPhaseLabel.textContent = 
      state.pomoPhase === 'focus' ? 'Focus Session' :
      state.pomoPhase === 'short_break' ? 'Short Break' : 'Long Break';

    // Update cycle dots
    const dots = pomoCyclesDots.querySelectorAll('.cycle-dot');
    dots.forEach((dot, idx) => {
      dot.className = 'cycle-dot';
      if (idx < state.pomoCycle - 1) {
        dot.classList.add('completed');
      } else if (idx === state.pomoCycle - 1) {
        dot.classList.add('active');
      }
    });
  } else {
    pomoPhaseIndicator.style.display = 'none';
  }
}

// Timer Phase Completion Handler
function handlePhaseComplete({ mode, phase, minutes }) {
  if (mode === 'pomodoro') {
    if (phase === 'focus') {
      const activeTask = taskManager.getPinnedTask();
      const taskTitle = activeTask ? activeTask.title : 'Deep Focus Session';

      // Record in Deep Analytics
      analyticsManager.recordFocusSession(minutes, true, taskTitle, 'pomodoro');
      taskManager.recordPomodoroForPinned();
      updateActiveTaskBanner();
      renderDeepAnalyticsUI();

      if (window.electronAPI) {
        window.electronAPI.showNotification(
          'Pomodoro Complete!',
          'Great focus work! Time to take a well-deserved break.'
        );
      }

      if (enableBreakPrompts) {
        breakReminder.show();
      }
    } else if (phase === 'break_end') {
      if (window.electronAPI) {
        window.electronAPI.showNotification(
          'Break Over',
          'Ready to dive back into your next focus session?'
        );
      }
    }
  } else if (mode === 'countdown') {
    if (window.electronAPI) {
      window.electronAPI.showNotification(
        'Countdown Finished',
        'Your timer duration has completed.'
      );
    }
  }
}

// --- Tasks UI Rendering ---
function renderTasksUI() {
  const tasks = taskManager.getTasks();
  tasksListContainer.innerHTML = '';

  if (tasks.length === 0) {
    tasksListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 24px 0;">
        No focus tasks yet. Add one above!
      </div>
    `;
    return;
  }

  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.completed ? 'done' : ''} ${task.pinned ? 'pinned' : ''}`;
    card.innerHTML = `
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}">
        ${task.completed ? '✓' : ''}
      </div>
      <div class="task-card-content" data-action="pin" data-id="${task.id}" title="Click to set as active focus target">
        <span class="task-name">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span>🍅 ${task.completedPomos || 0} / ${task.estimatedPomos || 1}</span>
          ${task.pinned ? '<span style="color: var(--accent-white); font-weight: 600;">• Active Focus</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" data-action="delete" data-id="${task.id}" title="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'toggle') {
        taskManager.toggleTask(id);
      } else if (action === 'delete') {
        taskManager.deleteTask(id);
      } else if (action === 'pin') {
        taskManager.pinTask(id);
      }
    });

    tasksListContainer.appendChild(card);
  });
}

function updateActiveTaskBanner() {
  const pinned = taskManager.getPinnedTask();
  if (pinned) {
    activeTaskBanner.style.display = 'flex';
    activeTaskDisplay.textContent = pinned.title;
    activeTaskPomoCount.textContent = `🍅 ${pinned.completedPomos || 0}/${pinned.estimatedPomos || 1}`;
  } else {
    activeTaskBanner.style.display = 'flex';
    activeTaskDisplay.textContent = 'No active task set — click to add';
    activeTaskPomoCount.textContent = '🍅 0/0';
  }
}

// --- Deep Analytics UI Rendering ---
function renderDeepAnalyticsUI() {
  const today = analyticsManager.getTodayStats();
  const streak = analyticsManager.getStreak();
  const totalMins = analyticsManager.getTotalFocusTime();
  const heatmap = analyticsManager.getHeatmapData(28);
  const tod = analyticsManager.getHourlyDistribution();
  const tasksAlloc = analyticsManager.getTaskDistribution();
  const sessions = analyticsManager.getSessionHistory(15);
  const last7Days = analyticsManager.getHeatmapData(7);

  // 1. Goal Progress
  goalProgressText.textContent = `${today.focusMinutes}m / ${today.goalMinutes}m (${today.progressPct}%)`;
  goalBarFill.style.width = `${today.progressPct}%`;

  // 2. Metrics
  statFocusTime.textContent = `${today.focusMinutes}m`;
  statPomoCount.textContent = String(today.pomodoros);
  statStreak.textContent = `${streak} 🔥`;
  statAllTime.textContent = `${(totalMins / 60).toFixed(1)}h`;

  // 3. 28-Day Heatmap
  heatmapGrid.innerHTML = '';
  heatmap.forEach(cell => {
    const el = document.createElement('div');
    el.className = `heatmap-cell lvl-${cell.level} ${cell.isToday ? 'today-cell' : ''}`;
    el.title = `${cell.dateStr} (${cell.dayName}): ${cell.focusMinutes}m (${cell.pomodoros} pomos)`;
    heatmapGrid.appendChild(el);
  });

  // 4. 7-Day Bar Chart
  analyticsChartBars.innerHTML = '';
  const maxMins = Math.max(60, ...last7Days.map(d => d.focusMinutes));
  last7Days.forEach(day => {
    const col = document.createElement('div');
    col.className = `chart-bar-col ${day.isToday ? 'today' : ''}`;
    const pct = Math.max(6, Math.min(100, Math.round((day.focusMinutes / maxMins) * 100)));
    col.innerHTML = `
      <div class="chart-bar-fill" style="height: ${pct}%;" title="${day.dayName}: ${day.focusMinutes}m (${day.pomodoros} pomos)"></div>
      <span class="chart-bar-label">${day.dayName}</span>
    `;
    analyticsChartBars.appendChild(col);
  });

  // 5. Hourly Distribution
  if (peakHourBadge && tod.peak) {
    peakHourBadge.textContent = `Peak: ${tod.peak.name.split(' ')[0]}`;
  }
  timeOfDayList.innerHTML = '';
  tod.blocks.forEach(b => {
    const row = document.createElement('div');
    row.className = 'tod-row';
    row.innerHTML = `
      <div class="tod-header">
        <span>${b.icon} ${b.name}</span>
        <span style="font-family: var(--font-mono);">${b.minutes}m (${b.pct}%)</span>
      </div>
      <div class="tod-bar-track">
        <div class="tod-bar-fill" style="width: ${b.pct}%;"></div>
      </div>
    `;
    timeOfDayList.appendChild(row);
  });

  // 6. Task Time Allocation
  taskAllocationList.innerHTML = '';
  if (tasksAlloc.length === 0) {
    taskAllocationList.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px 0;">
        Complete focus sessions on tasks to see breakdown
      </div>
    `;
  } else {
    tasksAlloc.slice(0, 5).forEach(t => {
      const row = document.createElement('div');
      row.className = 'task-alloc-row';
      row.innerHTML = `
        <div class="task-alloc-header">
          <span class="task-alloc-title">${escapeHtml(t.title)}</span>
          <span class="task-alloc-time">${t.minutes}m (${t.percentage}%)</span>
        </div>
        <div class="tod-bar-track">
          <div class="tod-bar-fill" style="width: ${t.percentage}%;"></div>
        </div>
      `;
      taskAllocationList.appendChild(row);
    });
  }

  // 7. Recent Sessions Log
  sessionHistoryList.innerHTML = '';
  if (sessions.length === 0) {
    sessionHistoryList.innerHTML = `
      <div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px 0;">
        No session records yet
      </div>
    `;
  } else {
    sessions.forEach(s => {
      const entry = document.createElement('div');
      entry.className = 'session-entry-card';
      entry.innerHTML = `
        <div class="session-info">
          <span class="session-title">${escapeHtml(s.taskTitle)}</span>
          <span class="session-time">${s.dateStr} • ${s.timeStr}</span>
        </div>
        <span class="session-badge">${s.durationMinutes}m ✓</span>
      `;
      sessionHistoryList.appendChild(entry);
    });
  }
}

// Download Helper
function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Drawer Open/Close Helper ---
function openDrawer(drawerName) {
  document.querySelectorAll('.drawer-section').forEach(sec => sec.style.display = 'none');
  const target = document.getElementById(`drawer-${drawerName}`);
  if (!target) return;

  target.style.display = 'flex';

  const titles = {
    tasks: 'Tasks & Focus Targets',
    audio: 'Ambient Soundscape Mixer',
    analytics: 'Deep Productivity Analytics',
    settings: 'Clock & Timer Settings'
  };
  drawerTitle.textContent = titles[drawerName] || 'Menu';

  drawerPanel.classList.add('open');
  drawerBackdrop.classList.add('open');

  dockButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.drawer === drawerName);
  });

  if (drawerName === 'analytics') {
    renderDeepAnalyticsUI();
  }
}

function closeDrawer() {
  drawerPanel.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  dockButtons.forEach(btn => btn.classList.remove('active'));
}

// Helper to escape HTML strings
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  // Navigation Mode Switching
  navModes.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;

    navModes.querySelectorAll('.nav-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    timerController.setMode(mode);

    if (mode === 'clock') {
      stageControls.style.display = 'none';
    } else {
      stageControls.style.display = 'flex';
    }
  });

  // Timer Control Buttons
  btnTimerToggle.addEventListener('click', () => {
    timerController.togglePlayPause();
  });

  btnTimerReset.addEventListener('click', () => {
    if (timerController.mode === 'pomodoro') timerController.resetPomodoro();
    else if (timerController.mode === 'countdown') timerController.resetCountdown();
    else if (timerController.mode === 'stopwatch') timerController.resetStopwatch();
  });

  btnTimerSkip.addEventListener('click', () => {
    if (timerController.mode === 'pomodoro') timerController.skipPomodoro();
  });

  // Active Task Banner click -> opens tasks drawer
  activeTaskBanner.addEventListener('click', () => {
    openDrawer('tasks');
  });

  // Dock Buttons (Drawers)
  dockButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const drawer = btn.dataset.drawer;
      if (drawerPanel.classList.contains('open') && btn.classList.contains('active')) {
        closeDrawer();
      } else {
        openDrawer(drawer);
      }
    });
  });

  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Add Task
  btnAddTask.addEventListener('click', () => {
    const title = newTaskTitle.value;
    const est = newTaskEst.value;
    if (taskManager.addTask(title, est)) {
      newTaskTitle.value = '';
    }
  });

  newTaskTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnAddTask.click();
    }
  });

  // Master Mute All Audio
  if (btnMasterMute) {
    btnMasterMute.addEventListener('click', toggleMasterMuteState);
  }
  if (toggleMasterMute) {
    toggleMasterMute.addEventListener('click', toggleMasterMuteState);
  }

  // Audio Drawer Toggles & Sliders
  toggleFlapAudio.addEventListener('click', () => {
    const isNowOn = !toggleFlapAudio.classList.contains('on');
    toggleFlapAudio.classList.toggle('on', isNowOn);
    appState.settings.flapSound = isNowOn;
    soundEngine.setFlapVolume(isNowOn ? 0.5 : 0);
    saveStoredData(appState);
  });

  toggleTickAudio.addEventListener('click', () => {
    const isNowOn = !toggleTickAudio.classList.contains('on');
    toggleTickAudio.classList.toggle('on', isNowOn);
    appState.settings.tickSound = isNowOn;
    soundEngine.setTickEnabled(isNowOn);
    saveStoredData(appState);
  });

  ambientToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const track = toggle.dataset.ambient;
      const isNowOn = !toggle.classList.contains('on');
      toggle.classList.toggle('on', isNowOn);

      const slider = document.querySelector(`.track-slider[data-ambient-slider="${track}"]`);
      const vol = slider ? parseFloat(slider.value) : 0.4;
      soundEngine.setAmbientTrack(track, isNowOn, vol);
    });
  });

  ambientSliders.forEach(slider => {
    slider.addEventListener('input', () => {
      const track = slider.dataset.ambientSlider;
      const vol = parseFloat(slider.value);
      const toggle = document.querySelector(`.track-toggle[data-ambient="${track}"]`);
      if (toggle && toggle.classList.contains('on')) {
        soundEngine.setAmbientTrack(track, true, vol);
      }
    });
  });

  // Deep Analytics Actions
  if (btnLoadSampleAnalytics) {
    btnLoadSampleAnalytics.addEventListener('click', () => {
      analyticsManager.loadSampleData();
      renderDeepAnalyticsUI();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const file = analyticsManager.exportData('csv');
      downloadFile(file.content, file.mimeType, file.filename);
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const file = analyticsManager.exportData('json');
      downloadFile(file.content, file.mimeType, file.filename);
    });
  }

  // Settings Presets & Toggles
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const focus = parseInt(pill.dataset.focus);
      const brk = parseInt(pill.dataset.break);
      appState.settings.pomodoroPreset = { focus, break: brk };
      timerController.setPomodoroPreset(focus, brk);
      saveStoredData(appState);
    });
  });

  toggleBlankLeadingZero.addEventListener('click', () => {
    blankLeadingZero = !blankLeadingZero;
    toggleBlankLeadingZero.classList.toggle('on', blankLeadingZero);
    appState.settings.blankLeadingZero = blankLeadingZero;
    saveStoredData(appState);
  });

  toggleAutostartBreaks.addEventListener('click', () => {
    const isNowOn = !toggleAutostartBreaks.classList.contains('on');
    toggleAutostartBreaks.classList.toggle('on', isNowOn);
    timerController.autoStartBreaks = isNowOn;
    appState.settings.autoStartBreaks = isNowOn;
    saveStoredData(appState);
  });

  toggle24hClock.addEventListener('click', () => {
    const isNowOn = !toggle24hClock.classList.contains('on');
    toggle24hClock.classList.toggle('on', isNowOn);
    timerController.clock24h = isNowOn;
    appState.settings.clock24h = isNowOn;
    saveStoredData(appState);
  });

  toggleShowSeconds.addEventListener('click', () => {
    const isNowOn = !toggleShowSeconds.classList.contains('on');
    toggleShowSeconds.classList.toggle('on', isNowOn);
    timerController.showSeconds = isNowOn;
    appState.settings.showSeconds = isNowOn;
    updateSecondsVisibility();
    saveStoredData(appState);
  });

  toggleBreakPrompts.addEventListener('click', () => {
    const isNowOn = !toggleBreakPrompts.classList.contains('on');
    toggleBreakPrompts.classList.toggle('on', isNowOn);
    enableBreakPrompts = isNowOn;
    appState.settings.breakPrompts = isNowOn;
    saveStoredData(appState);
  });

  // Break Modal Buttons
  btnBreakDone.addEventListener('click', () => breakReminder.hide());
  btnBreakSkip.addEventListener('click', () => breakReminder.hide());

  // Window Controls
  if (btnMinimize) {
    btnMinimize.addEventListener('click', () => window.electronAPI?.minimizeWindow());
  }
  if (btnMaximize) {
    btnMaximize.addEventListener('click', () => window.electronAPI?.maximizeWindow());
  }
  if (btnClose) {
    btnClose.addEventListener('click', () => window.electronAPI?.closeWindow());
  }

  // Fullscreen Toggles
  const handleFullscreenToggle = () => {
    if (window.electronAPI) {
      window.electronAPI.toggleFullscreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  btnFullscreenHeader.addEventListener('click', handleFullscreenToggle);
  dockBtnFullscreen.addEventListener('click', handleFullscreenToggle);

  // Pure Clock Mode Toggle
  const dockBtnPure = document.getElementById('dock-btn-pure');
  const pureModeExitHint = document.getElementById('pure-mode-exit-hint');
  const mainStage = document.querySelector('.main-stage');

  let isPureClockMode = false;
  let exitHintTimeout = null;

  function togglePureClockMode(force) {
    isPureClockMode = typeof force === 'boolean' ? force : !isPureClockMode;
    document.body.classList.toggle('mode-pure-clock', isPureClockMode);
    dockBtnPure?.classList.toggle('active', isPureClockMode);

    if (isPureClockMode) {
      closeDrawer();
      showPureExitHint();
    } else {
      hidePureExitHint();
    }
  }

  function showPureExitHint() {
    if (!pureModeExitHint || !isPureClockMode) return;
    pureModeExitHint.classList.add('visible');
    clearTimeout(exitHintTimeout);
    exitHintTimeout = setTimeout(() => {
      pureModeExitHint.classList.remove('visible');
    }, 3200);
  }

  function hidePureExitHint() {
    if (pureModeExitHint) pureModeExitHint.classList.remove('visible');
    clearTimeout(exitHintTimeout);
  }

  if (dockBtnPure) {
    dockBtnPure.addEventListener('click', () => togglePureClockMode());
  }
  if (pureModeExitHint) {
    pureModeExitHint.addEventListener('click', () => togglePureClockMode(false));
  }

  // Double click anywhere on the central stage or flip clock to toggle Pure Clock mode
  if (mainStage) {
    mainStage.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, .drawer-panel')) return;
      togglePureClockMode();
    });
  }

  // Reveal exit hint on mouse movement in Pure Mode
  window.addEventListener('mousemove', () => {
    if (isPureClockMode) {
      showPureExitHint();
    }
  });

  // Mini Floating Widget Toggle
  btnMiniMode.addEventListener('click', () => {
    const nextMode = currentWindowMode === 'mini' ? 'standard' : 'mini';
    setWindowDisplayMode(nextMode, true);
  });

  // Electron IPC Listeners
  if (window.electronAPI) {
    window.electronAPI.onWindowStateChange((state) => {
      if (state.mode) {
        setWindowDisplayMode(state.mode, false); // Prevent re-triggering IPC loop
      }
      if (typeof state.isFullscreen === 'boolean') {
        document.body.classList.toggle('mode-fullscreen', state.isFullscreen);
        if (state.isFullscreen) currentWindowMode = 'fullscreen';
        else if (currentWindowMode === 'fullscreen') currentWindowMode = 'standard';
      }
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      timerController.togglePlayPause();
    } else if (e.key === 'r' || e.key === 'R') {
      btnTimerReset.click();
    } else if (e.key === 's' || e.key === 'S') {
      btnTimerSkip.click();
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      togglePureClockMode();
    } else if (e.key === 'F11' || e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      handleFullscreenToggle();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMasterMuteState();
    } else if (e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      const nextMode = currentWindowMode === 'mini' ? 'standard' : 'mini';
      setWindowDisplayMode(nextMode, true);
    } else if (e.key === 'Escape') {
      if (currentWindowMode === 'mini') {
        e.preventDefault();
        setWindowDisplayMode('standard', true);
        return;
      }
      if (isPureClockMode) {
        togglePureClockMode(false);
        return;
      }
      closeDrawer();
      if (document.body.classList.contains('mode-fullscreen')) {
        handleFullscreenToggle();
      }
    }
  });
}

function setWindowDisplayMode(mode, notifyElectron = true) {
  if (currentWindowMode === mode && !notifyElectron) return;

  currentWindowMode = mode;
  const isMini = mode === 'mini';
  const isFullscreen = mode === 'fullscreen';

  document.body.classList.toggle('mode-mini', isMini);
  document.body.classList.toggle('mode-fullscreen', isFullscreen);

  if (btnMiniMode) {
    btnMiniMode.classList.toggle('active', isMini);
    btnMiniMode.title = isMini ? 'Restore Standard Window (W / Esc)' : 'Mini Floating Widget (W)';
  }

  // Close drawers when entering mini mode
  if (isMini) {
    closeDrawer();
  }

  if (notifyElectron && window.electronAPI) {
    window.electronAPI.setWindowMode(mode);
  }
}

// Start app
initApp();
