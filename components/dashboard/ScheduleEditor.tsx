'use client'

import { DAY_KEYS, DAY_LABELS, DEFAULT_SCHEDULE, DayKey, StoreSchedule } from '@/lib/storeSchedule'

interface Props {
  value: StoreSchedule
  onChange: (schedule: StoreSchedule) => void
}

export default function ScheduleEditor({ value, onChange }: Props) {
  const schedule = { ...DEFAULT_SCHEDULE, ...value }

  const update = (day: DayKey, field: 'active' | 'open' | 'close', val: boolean | string) => {
    onChange({ ...schedule, [day]: { ...schedule[day], [field]: val } })
  }

  return (
    <div className="space-y-2">
      {DAY_KEYS.map(day => {
        const conf = schedule[day]
        return (
          <div
            key={day}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              conf.active
                ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                : 'border-zinc-200 bg-zinc-50 opacity-70 dark:border-zinc-800 dark:bg-zinc-950'
            }`}
          >
            {/* Toggle día activo */}
            <button
              type="button"
              onClick={() => update(day, 'active', !conf.active)}
              aria-label={`${conf.active ? 'Desactivar' : 'Activar'} horario del ${DAY_LABELS[day]}`}
              aria-pressed={conf.active}
              className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors ${
                conf.active ? 'bg-zinc-900 dark:bg-indigo-300' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  conf.active ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>

            {/* Nombre del día */}
            <span className={`w-20 text-sm font-semibold ${conf.active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {DAY_LABELS[day]}
            </span>

            {/* Horario */}
            {conf.active ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={conf.open}
                  onChange={e => update(day, 'open', e.target.value)}
                  aria-label={`Hora de apertura del ${DAY_LABELS[day]}`}
                  className="w-[100px] rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <span className="text-zinc-500 text-sm">–</span>
                <input
                  type="time"
                  value={conf.close}
                  onChange={e => update(day, 'close', e.target.value)}
                  aria-label={`Hora de cierre del ${DAY_LABELS[day]}`}
                  className="w-[100px] rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            ) : (
              <span className="flex-1 text-xs text-zinc-500 dark:text-zinc-400 italic">Cerrado</span>
            )}
          </div>
        )
      })}

      <p className="pt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Los horarios usan la hora local del vendedor. El checkout se bloquea automáticamente fuera de horario.
      </p>
    </div>
  )
}
