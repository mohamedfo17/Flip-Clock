// Task Manager Component
export class TaskManager {
  constructor(initialTasks = [], onTasksChange = () => {}) {
    this.tasks = Array.isArray(initialTasks) && initialTasks.length > 0 
      ? initialTasks 
      : [
          {
            id: 'task-1',
            title: 'Deep focus on primary objective',
            completed: false,
            estimatedPomos: 4,
            completedPomos: 1,
            pinned: true,
            createdAt: Date.now()
          },
          {
            id: 'task-2',
            title: 'Review specifications & clean up code',
            completed: false,
            estimatedPomos: 2,
            completedPomos: 0,
            pinned: false,
            createdAt: Date.now() - 3600000
          }
        ];
    this.onTasksChange = onTasksChange;
  }

  getTasks() {
    return this.tasks;
  }

  getPinnedTask() {
    return this.tasks.find(t => t.pinned && !t.completed) || this.tasks.find(t => !t.completed) || null;
  }

  addTask(title, estimatedPomos = 1) {
    if (!title.trim()) return null;
    const newTask = {
      id: 'task-' + Date.now(),
      title: title.trim(),
      completed: false,
      estimatedPomos: Math.max(1, parseInt(estimatedPomos) || 1),
      completedPomos: 0,
      pinned: this.tasks.length === 0,
      createdAt: Date.now()
    };
    this.tasks.unshift(newTask);
    this.onTasksChange(this.tasks);
    return newTask;
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      if (task.completed && task.pinned) {
        task.pinned = false;
        // Auto-pin next incomplete task
        const nextIncomplete = this.tasks.find(t => !t.completed && t.id !== id);
        if (nextIncomplete) nextIncomplete.pinned = true;
      }
      this.onTasksChange(this.tasks);
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (!this.tasks.some(t => t.pinned)) {
      const firstIncomplete = this.tasks.find(t => !t.completed);
      if (firstIncomplete) firstIncomplete.pinned = true;
    }
    this.onTasksChange(this.tasks);
  }

  pinTask(id) {
    this.tasks.forEach(t => {
      t.pinned = (t.id === id);
    });
    this.onTasksChange(this.tasks);
  }

  recordPomodoroForPinned() {
    const pinned = this.getPinnedTask();
    if (pinned) {
      pinned.completedPomos = (pinned.completedPomos || 0) + 1;
      this.onTasksChange(this.tasks);
    }
  }
}
