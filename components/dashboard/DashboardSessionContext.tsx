'use client'

import { createContext, useContext } from 'react'
import type { Store } from '@/types/core'

export type DashboardPlanStatus = 'trial' | 'pro' | 'free' | 'inactivo' | null

export interface DashboardSession {
  userId: string
  userEmail: string
  userDisplayName: string
  planStatus: DashboardPlanStatus
  planExpiresAt: string | null
  store: Store | null
}

const DashboardSessionContext = createContext<DashboardSession | null>(null)

export function DashboardSessionProvider({
  value,
  children,
}: {
  value: DashboardSession
  children: React.ReactNode
}) {
  return (
    <DashboardSessionContext.Provider value={value}>
      {children}
    </DashboardSessionContext.Provider>
  )
}

export function useDashboardSession() {
  const session = useContext(DashboardSessionContext)
  if (!session) throw new Error('useDashboardSession debe usarse dentro del dashboard.')
  return session
}
