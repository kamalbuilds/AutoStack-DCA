'use client'

interface StrategyType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  badge?: string
  gradient: string
}

const STRATEGY_TYPES: StrategyType[] = [
  {
    id: 'basic',
    name: 'Basic DCA',
    description: 'Time-based recurring purchases at fixed intervals',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-[#6b7280] to-[#4b5563]',
  },
  {
    id: 'smart-money',
    name: 'Smart Money DCA',
    description: 'Buy when whales and institutional traders buy',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    badge: 'x402 + Nansen',
    gradient: 'from-[#f59e0b] to-[#d97706]',
  },
  {
    id: 'limit-order',
    name: 'Limit Order DCA',
    description: 'Buy automatically when price drops to target',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: 'from-[#10b981] to-[#059669]',
  },
  {
    id: 'smart-accumulate',
    name: 'Smart Accumulate',
    description: 'Combine smart money signals with price targets',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    badge: 'Pro',
    gradient: 'from-[#7c3aed] to-[#5b21b6]',
  },
]

interface StrategyTypeSelectorProps {
  selected: string
  onSelect: (id: string) => void
}

export function StrategyTypeSelector({ selected, onSelect }: StrategyTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[--text-secondary]">Strategy Type</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGY_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onSelect(type.id)}
            className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              selected === type.id
                ? 'border-[#7c3aed] bg-[#7c3aed]/5'
                : 'border-[--border-subtle] hover:border-[--border-default] bg-[--surface-1]'
            }`}
          >
            {type.badge && (
              <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${type.gradient} text-white`}>
                {type.badge}
              </span>
            )}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${type.gradient} text-white shrink-0`}>
                {type.icon}
              </div>
              <div className="min-w-0">
                <div className={`font-semibold mb-0.5 ${
                  selected === type.id ? 'text-[--text-primary]' : 'text-[--text-secondary]'
                }`}>
                  {type.name}
                </div>
                <div className="text-xs text-[--text-tertiary] line-clamp-2">
                  {type.description}
                </div>
              </div>
            </div>
            {selected === type.id && (
              <div className="absolute top-3 left-3">
                <svg className="w-5 h-5 text-[#7c3aed]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
