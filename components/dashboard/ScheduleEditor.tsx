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
                ? 'border-neutral-200 bg-white'
                : 'border-neutral-100 bg-neutral-50 opacity-60'
            }`}
          >
            {/* Toggle día activo */}
            <button
              type="button"
              onClick={() => update(day, 'active', !conf.active)}
              className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors ${
                conf.active ? 'bg-black' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  conf.active ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>

            {/* Nombre del día */}
            <span className={`w-20 text-sm font-semibold ${conf.active ? 'text-[#111]' : 'text-neutral-400'}`}>
              {DAY_LABELS[day]}
            </span>

            {/* Horario */}
            {conf.active ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={conf.open}
                  onChange={e => update(day, 'open', e.target.value)}
                  className="border border-neutral-200 rounded-lg px-2 py-1 text-sm text-[#333] focus:outline-none focus:border-black w-[100px]"
                />
                <span className="text-neutral-400 text-sm">–</span>
                <input
                  type="time"
                  value={conf.close}
                  onChange={e => update(day, 'close', e.target.value)}
                  className="border border-neutral-200 rounded-lg px-2 py-1 text-sm text-[#333] focus:outline-none focus:border-black w-[100px]"
                />
              </div>
            ) : (
              <span className="flex-1 text-xs text-neutral-400 italic">Cerrado</span>
            )}
          </div>
        )
      })}

      <p className="text-xs text-neutral-400 pt-1">
        💡 Los horarios son en hora local del vendedor. El checkout se bloquea automáticamente fuera de horario.
      </p>
    </div>
  )
}
