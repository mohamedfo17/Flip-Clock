// Deep Productivity Analytics Engine

export class AnalyticsManager {
  constructor(initialData = {}, onDataChange = () => {}) {
    this.data = initialData && typeof initialData === 'object' ? initialData : {};
    if (!this.data.history) this.data.history = {};
    if (!this.data.sessions) this.data.sessions = [];
    if (typeof this.data.streak !== 'number') this.data.streak = 1;
    if (typeof this.data.longestStreak !== 'number') this.data.longestStreak = 1;
    if (typeof this.data.dailyGoalMinutes !== 'number') this.data.dailyGoalMinutes = 120;
    if (!this.data.lastActiveDate) this.data.lastActiveDate = this.getTodayDateString();
    
    this.onDataChange = onDataChange;
    this.checkStreakContinuity();
  }

  getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  checkStreakContinuity() {
    const today = this.getTodayDateString();
    const lastActive = this.data.lastActiveDate;

    if (lastActive && lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      if (lastActive !== yesterdayStr) {
        this.data.streak = 1;
      }
    }
  }

  recordFocusSession(minutes = 25, isPomodoro = true, taskTitle = 'Deep Focus Session', mode = 'pomodoro') {
    const today = this.getTodayDateString();
    const now = new Date();
    const hour = now.getHours();

    // 1. Daily Aggregates
    if (!this.data.history[today]) {
      this.data.history[today] = {
        focusMinutes: 0,
        pomodoros: 0,
        hourlyBuckets: new Array(24).fill(0),
        taskBreakdown: {}
      };
    }

    const dayRecord = this.data.history[today];
    dayRecord.focusMinutes += minutes;
    if (isPomodoro) dayRecord.pomodoros += 1;

    // Hourly tracking
    if (!Array.isArray(dayRecord.hourlyBuckets)) dayRecord.hourlyBuckets = new Array(24).fill(0);
    dayRecord.hourlyBuckets[hour] = (dayRecord.hourlyBuckets[hour] || 0) + minutes;

    // Task breakdown
    if (!dayRecord.taskBreakdown) dayRecord.taskBreakdown = {};
    const taskKey = taskTitle || 'General Focus';
    dayRecord.taskBreakdown[taskKey] = (dayRecord.taskBreakdown[taskKey] || 0) + minutes;

    // 2. Streaks
    if (this.data.lastActiveDate !== today) {
      this.data.streak = (this.data.streak || 0) + 1;
      this.data.longestStreak = Math.max(this.data.longestStreak || 1, this.data.streak);
      this.data.lastActiveDate = today;
    }

    // 3. Session Log
    if (!Array.isArray(this.data.sessions)) this.data.sessions = [];
    this.data.sessions.unshift({
      id: 'sess-' + Date.now(),
      timestamp: Date.now(),
      dateStr: today,
      timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      taskTitle: taskKey,
      durationMinutes: minutes,
      mode: mode,
      completed: true
    });

    // Keep last 100 sessions
    if (this.data.sessions.length > 100) {
      this.data.sessions = this.data.sessions.slice(0, 100);
    }

    this.onDataChange(this.data);
  }

  getTodayStats() {
    const today = this.getTodayDateString();
    const day = this.data.history[today] || { focusMinutes: 0, pomodoros: 0 };
    const goal = this.data.dailyGoalMinutes || 120;
    const progress = Math.min(100, Math.round((day.focusMinutes / goal) * 100));

    return {
      focusMinutes: day.focusMinutes || 0,
      pomodoros: day.pomodoros || 0,
      goalMinutes: goal,
      progressPct: progress
    };
  }

  getTotalFocusTime() {
    let totalMins = 0;
    Object.values(this.data.history || {}).forEach(day => {
      totalMins += day.focusMinutes || 0;
    });
    return totalMins;
  }

  getStreak() {
    return this.data.streak || 1;
  }

  getLongestStreak() {
    return this.data.longestStreak || 1;
  }

  // 28-day Activity Heatmap (4 full weeks)
  getHeatmapData(daysCount = 28) {
    const result = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayData = this.data.history[dateStr] || { focusMinutes: 0, pomodoros: 0 };
      const mins = dayData.focusMinutes || 0;

      // Intensity level 0 to 4
      let level = 0;
      if (mins > 0 && mins < 30) level = 1;
      else if (mins >= 30 && mins < 60) level = 2;
      else if (mins >= 60 && mins < 120) level = 3;
      else if (mins >= 120) level = 4;

      result.push({
        dateStr,
        dayName: days[d.getDay()],
        dayNumber: d.getDate(),
        isToday: i === 0,
        focusMinutes: mins,
        pomodoros: dayData.pomodoros || 0,
        level
      });
    }

    return result;
  }

  // Hourly Productivity Distribution (Time of Day)
  getHourlyDistribution() {
    let morning = 0;    // 06:00 - 12:00
    let afternoon = 0;  // 12:00 - 18:00
    let evening = 0;    // 18:00 - 23:00
    let night = 0;      // 23:00 - 06:00

    Object.values(this.data.history || {}).forEach(day => {
      const buckets = day.hourlyBuckets || [];
      for (let h = 0; h < 24; h++) {
        const val = buckets[h] || 0;
        if (h >= 6 && h < 12) morning += val;
        else if (h >= 12 && h < 18) afternoon += val;
        else if (h >= 18 && h < 23) evening += val;
        else night += val;
      }
    });

    const total = morning + afternoon + evening + night || 1;
    const blocks = [
      { name: 'Morning (6am-12pm)', minutes: morning, pct: Math.round((morning / total) * 100), icon: '🌅' },
      { name: 'Afternoon (12pm-6pm)', minutes: afternoon, pct: Math.round((afternoon / total) * 100), icon: '☀️' },
      { name: 'Evening (6pm-11pm)', minutes: evening, pct: Math.round((evening / total) * 100), icon: '🌆' },
      { name: 'Night Owl (11pm-6am)', minutes: night, pct: Math.round((night / total) * 100), icon: '🌙' }
    ];

    // Find peak block
    const peak = [...blocks].sort((a, b) => b.minutes - a.minutes)[0];

    return { blocks, peak };
  }

  // Focus Time by Task
  getTaskDistribution() {
    const taskTotals = {};
    let grandTotal = 0;

    Object.values(this.data.history || {}).forEach(day => {
      const tasks = day.taskBreakdown || {};
      Object.entries(tasks).forEach(([title, mins]) => {
        taskTotals[title] = (taskTotals[title] || 0) + mins;
        grandTotal += mins;
      });
    });

    const list = Object.entries(taskTotals).map(([title, minutes]) => ({
      title,
      minutes,
      percentage: grandTotal > 0 ? Math.round((minutes / grandTotal) * 100) : 0
    }));

    return list.sort((a, b) => b.minutes - a.minutes);
  }

  // Recent Sessions Log
  getSessionHistory(limit = 15) {
    return (this.data.sessions || []).slice(0, limit);
  }

  // Populate Demo / Realistic Sample Data for rich visual exploration
  loadSampleData() {
    const tasks = [
      'Deep focus on primary objective',
      'Review specifications & clean up code',
      'System Architecture & Refactoring',
      'Client Presentation & Deck'
    ];

    // Generate past 28 days of activity
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseMins = isWeekend ? Math.floor(Math.random() * 45) : (50 + Math.floor(Math.random() * 125));
      const pomos = Math.max(1, Math.round(baseMins / 25));

      const hourly = new Array(24).fill(0);
      hourly[9] = Math.round(baseMins * 0.25);
      hourly[11] = Math.round(baseMins * 0.35);
      hourly[14] = Math.round(baseMins * 0.25);
      hourly[16] = Math.round(baseMins * 0.15);

      const taskBreakdown = {};
      const t1 = tasks[i % tasks.length];
      const t2 = tasks[(i + 1) % tasks.length];
      taskBreakdown[t1] = Math.round(baseMins * 0.65);
      taskBreakdown[t2] = Math.round(baseMins * 0.35);

      this.data.history[dateStr] = {
        focusMinutes: baseMins,
        pomodoros: pomos,
        hourlyBuckets: hourly,
        taskBreakdown
      };
    }

    this.data.streak = 8;
    this.data.longestStreak = 14;

    // Generate sample sessions
    this.data.sessions = [
      {
        id: 'sess-1',
        timestamp: Date.now() - 1800000,
        dateStr: this.getTodayDateString(),
        timeStr: '02:30 PM',
        taskTitle: 'System Architecture & Refactoring',
        durationMinutes: 50,
        mode: 'pomodoro',
        completed: true
      },
      {
        id: 'sess-2',
        timestamp: Date.now() - 5400000,
        dateStr: this.getTodayDateString(),
        timeStr: '11:15 AM',
        taskTitle: 'Deep focus on primary objective',
        durationMinutes: 25,
        mode: 'pomodoro',
        completed: true
      },
      {
        id: 'sess-3',
        timestamp: Date.now() - 86400000,
        dateStr: 'Yesterday',
        timeStr: '04:00 PM',
        taskTitle: 'Review specifications & clean up code',
        durationMinutes: 25,
        mode: 'pomodoro',
        completed: true
      },
      {
        id: 'sess-4',
        timestamp: Date.now() - 90000000,
        dateStr: 'Yesterday',
        timeStr: '01:45 PM',
        taskTitle: 'Client Presentation & Deck',
        durationMinutes: 25,
        mode: 'pomodoro',
        completed: true
      }
    ];

    this.onDataChange(this.data);
  }

  // Export Analytics Data as JSON or CSV
  exportData(format = 'json') {
    if (format === 'csv') {
      let csv = 'Date,Time,Task,Duration(Minutes),Mode,Status\n';
      (this.data.sessions || []).forEach(s => {
        csv += `"${s.dateStr}","${s.timeStr}","${s.taskTitle.replace(/"/g, '""')}",${s.durationMinutes},"${s.mode}","Completed"\n`;
      });
      return { content: csv, mimeType: 'text/csv', filename: 'flip-clock-productivity.csv' };
    } else {
      const json = JSON.stringify(this.data, null, 2);
      return { content: json, mimeType: 'application/json', filename: 'flip-clock-productivity.json' };
    }
  }
}
