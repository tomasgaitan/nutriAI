const MACROS = [
  { key: 'protein', label: 'Proteínas',     color: '#3b82f6', unit: 'g', targetKey: 'protein_target' },
  { key: 'carbs',   label: 'Carbohidratos', color: '#f97316', unit: 'g', targetKey: 'carbs_target'   },
  { key: 'fats',    label: 'Grasas',        color: '#ec4899', unit: 'g', targetKey: 'fats_target'    },
]

export default function MacroBars({ totals, profile }) {
  return (
    <div className="space-y-4">
      {MACROS.map(m => {
        const consumed = Math.round(totals?.[m.key] ?? 0)
        const target   = Math.round(profile?.[m.targetKey] ?? 0)
        const pct      = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
        const over     = consumed > target

        return (
          <div key={m.key}>
            <div className="flex justify-between text-xs font-dm mb-1.5">
              <span className="font-medium" style={{ color: m.color }}>{m.label}</span>
              <span className="text-muted">
                <span className={over ? 'text-carb-orange' : 'text-white'}>{consumed}</span>
                /{target}{m.unit}
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full macro-bar-fill"
                style={{
                  width:           `${pct}%`,
                  backgroundColor: over ? '#f97316' : m.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
