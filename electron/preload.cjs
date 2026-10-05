const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  toggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),
  setWindowMode: (mode) => ipcRenderer.invoke('window-set-mode', mode),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Storage IPC
  saveData: (data) => ipcRenderer.invoke('storage-save', data),
  loadData: () => ipcRenderer.invoke('storage-load'),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('notification-show', { title, body }),

  // Mode listeners
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, state) => callback(state));
  }
});
