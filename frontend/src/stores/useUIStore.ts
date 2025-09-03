import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaskFilters } from '../types/task';

// UI state interface
interface UIState {
  // Task management UI state
  taskFilters: TaskFilters;
  taskViewMode: 'list' | 'grid' | 'kanban';
  taskSortBy: 'created_at' | 'due_date' | 'priority' | 'title';
  taskSortOrder: 'asc' | 'desc';
  selectedTaskIds: number[];
  
  // Chat UI state
  isChatOpen: boolean;
  chatInputValue: string;
  
  // Calendar UI state
  isCalendarConnected: boolean;
  calendarSyncEnabled: boolean;
  
  // General UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  
  // Actions
  setTaskFilters: (filters: Partial<TaskFilters>) => void;
  clearTaskFilters: () => void;
  setTaskViewMode: (mode: 'list' | 'grid' | 'kanban') => void;
  setTaskSort: (sortBy: string, order: 'asc' | 'desc') => void;
  setSelectedTaskIds: (ids: number[]) => void;
  toggleTaskSelection: (id: number) => void;
  clearTaskSelection: () => void;
  
  setChatOpen: (open: boolean) => void;
  setChatInputValue: (value: string) => void;
  
  setCalendarConnected: (connected: boolean) => void;
  setCalendarSyncEnabled: (enabled: boolean) => void;
  
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Notification interface
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Create the UI store with persistence
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      taskFilters: {},
      taskViewMode: 'list',
      taskSortBy: 'created_at',
      taskSortOrder: 'desc',
      selectedTaskIds: [],
      
      isChatOpen: false,
      chatInputValue: '',
      
      isCalendarConnected: false,
      calendarSyncEnabled: false,
      
      sidebarOpen: true,
      theme: 'system',
      notifications: [],
      
      // Task management actions
      setTaskFilters: (filters) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, ...filters },
        })),
      
      clearTaskFilters: () =>
        set({ taskFilters: {} }),
      
      setTaskViewMode: (mode) =>
        set({ taskViewMode: mode }),
      
      setTaskSort: (sortBy, order) =>
        set({ 
          taskSortBy: sortBy as any,
          taskSortOrder: order,
        }),
      
      setSelectedTaskIds: (ids) =>
        set({ selectedTaskIds: ids }),
      
      toggleTaskSelection: (id) =>
        set((state) => ({
          selectedTaskIds: state.selectedTaskIds.includes(id)
            ? state.selectedTaskIds.filter((taskId) => taskId !== id)
            : [...state.selectedTaskIds, id],
        })),
      
      clearTaskSelection: () =>
        set({ selectedTaskIds: [] }),
      
      // Chat actions
      setChatOpen: (open) =>
        set({ isChatOpen: open }),
      
      setChatInputValue: (value) =>
        set({ chatInputValue: value }),
      
      // Calendar actions
      setCalendarConnected: (connected) =>
        set({ isCalendarConnected: connected }),
      
      setCalendarSyncEnabled: (enabled) =>
        set({ calendarSyncEnabled: enabled }),
      
      // General UI actions
      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }),
      
      setTheme: (theme) =>
        set({ theme }),
      
      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            },
          ],
        })),
      
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () =>
        set({ notifications: [] }),
    }),
    {
      name: 'ollama-todo-ui-state',
      // Only persist certain parts of the state
      partialize: (state) => ({
        taskViewMode: state.taskViewMode,
        taskSortBy: state.taskSortBy,
        taskSortOrder: state.taskSortOrder,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        calendarSyncEnabled: state.calendarSyncEnabled,
      }),
    }
  )
);

// Selectors for commonly used state combinations
export const useTaskUIState = () => {
  const {
    taskFilters,
    taskViewMode,
    taskSortBy,
    taskSortOrder,
    selectedTaskIds,
    setTaskFilters,
    clearTaskFilters,
    setTaskViewMode,
    setTaskSort,
    setSelectedTaskIds,
    toggleTaskSelection,
    clearTaskSelection,
  } = useUIStore();
  
  return {
    filters: taskFilters,
    viewMode: taskViewMode,
    sortBy: taskSortBy,
    sortOrder: taskSortOrder,
    selectedIds: selectedTaskIds,
    setFilters: setTaskFilters,
    clearFilters: clearTaskFilters,
    setViewMode: setTaskViewMode,
    setSort: setTaskSort,
    setSelectedIds: setSelectedTaskIds,
    toggleSelection: toggleTaskSelection,
    clearSelection: clearTaskSelection,
  };
};

export const useChatUIState = () => {
  const {
    isChatOpen,
    chatInputValue,
    setChatOpen,
    setChatInputValue,
  } = useUIStore();
  
  return {
    isOpen: isChatOpen,
    inputValue: chatInputValue,
    setOpen: setChatOpen,
    setInputValue: setChatInputValue,
  };
};

export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useUIStore();
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
};