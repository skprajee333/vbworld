import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export type ToastItem = {
  id: string
  title?: string
  message: string
  tone: ToastTone
}

type UiStore = {
  toasts: ToastItem[]
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
}

export const useUi = create<UiStore>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({
      toasts: [...state.toasts, { id, ...toast }].slice(-4),
    }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
    }, 4200)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}))
