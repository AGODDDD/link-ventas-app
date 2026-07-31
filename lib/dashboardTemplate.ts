export const DASHBOARD_TEMPLATE_TYPES = ['restaurante', 'comercio', 'moda'] as const

export type DashboardTemplateType = (typeof DASHBOARD_TEMPLATE_TYPES)[number]

export type DashboardTemplateState =
  | { status: 'loading' }
  | { status: 'ready'; value: DashboardTemplateType }
  | { status: 'error'; message: string }

export const INITIAL_DASHBOARD_TEMPLATE_STATE: DashboardTemplateState = {
  status: 'loading',
}

export function resolveDashboardTemplate(value: unknown): DashboardTemplateType {
  return DASHBOARD_TEMPLATE_TYPES.includes(value as DashboardTemplateType)
    ? (value as DashboardTemplateType)
    : 'comercio'
}
