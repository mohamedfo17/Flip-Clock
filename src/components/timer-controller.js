// Timer Controller: Clock, Pomodoro, Countdown, and Stopwatch State Engines
import { soundEngine } from '../audio/sound-engine.js';

export class TimerController {
  constructor(options = {}) {
    this.mode = 'clock'; // 'clock' | 'pomodoro' | 'countdown' | 'stopwatch'
    this.isRunning = false;
    this.timerId = null;
    this.lastTimestamp = 0;

    // Callbacks
    this.onTick = options.onTick || (() => {});
    this.onPhaseComplete = options.onPhaseComplete || (() => {});

    // Clock Settings
    this.clock24h = false;
    this.showSeconds = true;

    // Pomodoro Settings & State
    this.pomoDurations = {
      focus: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.pomoPhase = 'focus'; // 'focus' | 'short_break' | 'long_break'
    this.pomoCycle = 1;
    this.pomoRemaining = this.pomoDurations.focus;
    this.pomoTotal = this.pomoDurations.focus;
    this.autoStartBreaks = true;
    this.autoStartPomodoros = false;

    // Countdown State
    this.countdownInitial = 15 * 60; // default 15 min
    this.countdownRemaining = 15 * 60;

    // Stopwatch State
    this.stopwatchElapsed = 0; // in seconds
    this.stopwatchLaps = [];

    // Start tick loop
    this.startLoop();
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this.triggerTickUpdate();
  }

  startLoop() {
    this.lastTimestamp = Date.now();
    this.timerId = setInterval(() => {
      this.tick();
    }, 250); // fast polling for accurate second detection
  }

  tick() {
    const now = Date.now();
    const delta = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    if (this.mode === 'clock') {
      this.triggerTickUpdate();
    } else if (this.isRunning) {
      if (this.mode === 'pomodoro') {
        this.pomoRemaining = Math.max(0, this.pomoRemaining - delta);
        if (Math.floor(this.pomoRemaining) !== Math.floor(this.pomoRemaining + delta)) {
          soundEngine.playTick();
        }
        if (this.pomoRemaining <= 0) {
          this.handlePomodoroPhaseEnd();
        }
      } else if (this.mode === 'countdown') {
        this.countdownRemaining = Math.max(0, this.countdownRemaining - delta);
        if (Math.floor(this.countdownRemaining) !== Math.floor(this.countdownRemaining + delta)) {
          soundEngine.playTick();
        }
        if (this.countdownRemaining <= 0) {
          this.handleCountdownEnd();
        }
      } else if (this.mode === 'stopwatch') {
        this.stopwatchElapsed += delta;
      }
      this.triggerTickUpdate();
    }
  }

  triggerTickUpdate() {
    let hours = '00', minutes = '00', seconds = '00', meridiem = '';

    if (this.mode === 'clock') {
      const d = new Date();
      let h = d.getHours();
      let m = d.getMinutes();
      let s = d.getSeconds();

      if (!this.clock24h) {
        meridiem = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
      }
      hours = String(h).padStart(2, '0');
      minutes = String(m).padStart(2, '0');
      seconds = String(s).padStart(2, '0');
    } else if (this.mode === 'pomodoro') {
      const rem = Math.ceil(this.pomoRemaining);
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      hours = '00';
      minutes = String(m).padStart(2, '0');
      seconds = String(s).padStart(2, '0');
      meridiem = this.pomoPhase === 'focus' ? 'FOCUS' : 'REST';
    } else if (this.mode === 'countdown') {
      const rem = Math.ceil(this.countdownRemaining);
      const h = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      hours = String(h).padStart(2, '0');
      minutes = String(m).padStart(2, '0');
      seconds = String(s).padStart(2, '0');
      meridiem = 'TIMER';
    } else if (this.mode === 'stopwatch') {
      const el = Math.floor(this.stopwatchElapsed);
      const h = Math.floor(el / 3600);
      const m = Math.floor((el % 3600) / 60);
      const s = el % 60;
      hours = String(h).padStart(2, '0');
      minutes = String(m).padStart(2, '0');
      seconds = String(s).padStart(2, '0');
      meridiem = 'LAP';
    }

    this.onTick({
      mode: this.mode,
      hours,
      minutes,
      seconds,
      meridiem,
      isRunning: this.isRunning,
      showSeconds: this.showSeconds,
      pomoPhase: this.pomoPhase,
      pomoCycle: this.pomoCycle,
      pomoProgress: this.mode === 'pomodoro' ? 1 - (this.pomoRemaining / this.pomoTotal) : 0,
      countdownProgress: this.mode === 'countdown' ? 1 - (this.countdownRemaining / this.countdownInitial) : 0,
      stopwatchElapsed: this.stopwatchElapsed,
      stopwatchLaps: this.stopwatchLaps
    });
  }

  // --- Pomodoro Management ---
  setPomodoroPreset(focusMin, shortBreakMin, longBreakMin = 15) {
    this.pomoDurations.focus = focusMin * 60;
    this.pomoDurations.shortBreak = shortBreakMin * 60;
    this.pomoDurations.longBreak = longBreakMin * 60;
    this.resetPomodoro();
  }

  startPomodoro() {
    this.isRunning = true;
    this.lastTimestamp = Date.now();
    this.triggerTickUpdate();
  }

  pausePomodoro() {
    this.isRunning = false;
    this.triggerTickUpdate();
  }

  togglePlayPause() {
    if (this.mode === 'clock') return;
    this.isRunning = !this.isRunning;
    this.lastTimestamp = Date.now();
    this.triggerTickUpdate();
  }

  resetPomodoro() {
    this.isRunning = false;
    this.pomoRemaining = this.pomoDurations[this.pomoPhase === 'short_break' ? 'shortBreak' : this.pomoPhase === 'long_break' ? 'longBreak' : 'focus'];
    this.pomoTotal = this.pomoRemaining;
    this.triggerTickUpdate();
  }

  skipPomodoro() {
    this.handlePomodoroPhaseEnd(true);
  }

  handlePomodoroPhaseEnd(skipped = false) {
    this.isRunning = false;
    soundEngine.playChime();

    const previousPhase = this.pomoPhase;
    const focusMins = Math.round(this.pomoDurations.focus / 60);

    if (previousPhase === 'focus') {
      if (!skipped) {
        this.onPhaseComplete({
          mode: 'pomodoro',
          phase: 'focus',
          minutes: focusMins,
          cycle: this.pomoCycle
        });
      }

      // Check if long break (every 4 cycles)
      if (this.pomoCycle >= 4) {
        this.pomoPhase = 'long_break';
        this.pomoRemaining = this.pomoDurations.longBreak;
        this.pomoTotal = this.pomoDurations.longBreak;
        this.pomoCycle = 1;
      } else {
        this.pomoPhase = 'short_break';
        this.pomoRemaining = this.pomoDurations.shortBreak;
        this.pomoTotal = this.pomoDurations.shortBreak;
        this.pomoCycle += 1;
      }

      if (this.autoStartBreaks) {
        this.isRunning = true;
      }
    } else {
      // Break ended -> back to focus
      this.pomoPhase = 'focus';
      this.pomoRemaining = this.pomoDurations.focus;
      this.pomoTotal = this.pomoDurations.focus;

      this.onPhaseComplete({
        mode: 'pomodoro',
        phase: 'break_end'
      });

      if (this.autoStartPomodoros) {
        this.isRunning = true;
      }
    }

    this.lastTimestamp = Date.now();
    this.triggerTickUpdate();
  }

  // --- Countdown Management ---
  setCountdownDuration(seconds) {
    this.countdownInitial = seconds;
    this.countdownRemaining = seconds;
    this.isRunning = false;
    this.triggerTickUpdate();
  }

  resetCountdown() {
    this.isRunning = false;
    this.countdownRemaining = this.countdownInitial;
    this.triggerTickUpdate();
  }

  handleCountdownEnd() {
    this.isRunning = false;
    soundEngine.playChime();
    this.onPhaseComplete({ mode: 'countdown' });
    this.triggerTickUpdate();
  }

  // --- Stopwatch Management ---
  resetStopwatch() {
    this.isRunning = false;
    this.stopwatchElapsed = 0;
    this.stopwatchLaps = [];
    this.triggerTickUpdate();
  }

  addStopwatchLap() {
    if (this.mode !== 'stopwatch') return;
    const lapNum = this.stopwatchLaps.length + 1;
    this.stopwatchLaps.unshift({
      lap: lapNum,
      time: this.stopwatchElapsed
    });
    this.triggerTickUpdate();
  }
}
