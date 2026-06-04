import { create } from 'zustand';

import { PRIORITY_TASKS, VENDOR_SUGGESTIONS } from '@/data/home-dashboard-mock';

type HomeDashboardState = {
  loading: boolean;
  taskDone: Record<string, boolean>;
  savedSuggestionIds: string[];
  setLoading: (loading: boolean) => void;
  toggleTask: (taskId: string) => void;
  toggleSuggestionFavorite: (suggestionId: string) => void;
};

const initialTaskDone = PRIORITY_TASKS.reduce<Record<string, boolean>>((acc, task) => {
  acc[task.id] = task.done;
  return acc;
}, {});

const initialFavorites = VENDOR_SUGGESTIONS.slice(0, 1).map((item) => item.id);

export const useHomeDashboardStore = create<HomeDashboardState>((set) => ({
  loading: true,
  taskDone: initialTaskDone,
  savedSuggestionIds: initialFavorites,
  setLoading: (loading) => set({ loading }),
  toggleTask: (taskId) =>
    set((state) => ({
      taskDone: {
        ...state.taskDone,
        [taskId]: !state.taskDone[taskId],
      },
    })),
  toggleSuggestionFavorite: (suggestionId) =>
    set((state) => {
      const exists = state.savedSuggestionIds.includes(suggestionId);
      return {
        savedSuggestionIds: exists
          ? state.savedSuggestionIds.filter((id) => id !== suggestionId)
          : [...state.savedSuggestionIds, suggestionId],
      };
    }),
}));
