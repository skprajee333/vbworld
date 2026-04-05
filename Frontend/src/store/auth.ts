import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  role: string
  branchId?: string
  branchName?: string
  impersonated?: boolean
  actorUserId?: string
  actorName?: string
  actorRole?: string
}

interface AuthStore {
  user: User | null
  token: string | null
  impersonating: User | null
  realUser: User | null
  realToken: string | null
  realRefreshToken: string | null
  setAuth: (user: User, token: string, refresh: string) => void
  startImpersonate: (target: User, targetToken: string, targetRefreshToken: string) => void
  stopImpersonate: () => void
  clear: () => void
  effectiveUser: () => User | null
  isAdmin: () => boolean
  isWarehouseAdmin: () => boolean
  isWarehouse: () => boolean
  isRestaurant: () => boolean
  canManageUsers: () => boolean
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      impersonating: null,
      realUser: null,
      realToken: null,
      realRefreshToken: null,

      setAuth: (user, token, refresh) => {
        localStorage.setItem('token', token)
        localStorage.setItem('refreshToken', refresh)
        set({ user, token, impersonating: null, realUser: null, realToken: null, realRefreshToken: null })
      },

      startImpersonate: (target, targetToken, targetRefreshToken) => {
        const { user, token } = get()
        const currentRefreshToken = localStorage.getItem('refreshToken')
        localStorage.setItem('token', targetToken)
        localStorage.setItem('refreshToken', targetRefreshToken)
        set({
          impersonating: target,
          realUser: user,
          realToken: token,
          realRefreshToken: currentRefreshToken,
          token: targetToken,
        })
      },

      stopImpersonate: () => {
        const { realToken, realRefreshToken } = get()
        if (realToken) localStorage.setItem('token', realToken)
        if (realRefreshToken) localStorage.setItem('refreshToken', realRefreshToken)
        set({ impersonating: null, realUser: null, realToken: null, realRefreshToken: null, token: realToken || null })
      },

      clear: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        set({ user: null, token: null, impersonating: null, realUser: null, realToken: null, realRefreshToken: null })
      },

      effectiveUser: () => get().impersonating || get().user,
      isAdmin: () => get().user?.role === 'ADMIN',
      isWarehouseAdmin: () => get().user?.role === 'WAREHOUSE_ADMIN',
      canManageUsers: () => ['ADMIN', 'WAREHOUSE_ADMIN'].includes(get().user?.role || ''),
      isWarehouse: () => ['WAREHOUSE_MANAGER', 'WAREHOUSE_ADMIN'].includes((get().impersonating || get().user)?.role || ''),
      isRestaurant: () => (get().impersonating || get().user)?.role === 'RESTAURANT_STAFF',
    }),
    {
      name: 'vbw-auth',
      partialize: s => ({
        user: s.user,
        token: s.token,
        impersonating: s.impersonating,
        realUser: s.realUser,
        realToken: s.realToken,
        realRefreshToken: s.realRefreshToken,
      }),
    }
  )
)
