import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getClientByCode } from '../lib/clients'
import Spinner from '../components/shared/Spinner'

const CODE_LENGTH = 6

function statusFor(passes) {
  if (passes === 0) return { label: 'No passes left', color: 'red' }
  if (passes <= 2)  return { label: 'Running low',    color: 'amber' }
  return               { label: 'Active',             color: 'green' }
}

const palette = {
  green: {
    count:   'text-green-500',
    badge:   'bg-green-50 text-green-700 ring-1 ring-green-200',
    bar:     'bg-green-400',
    track:   'bg-green-100',
  },
  amber: {
    count:   'text-amber-500',
    badge:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    bar:     'bg-amber-400',
    track:   'bg-amber-100',
  },
  red: {
    count:   'text-red-500',
    badge:   'bg-red-50 text-red-700 ring-1 ring-red-200',
    bar:     'bg-red-400',
    track:   'bg-red-100',
  },
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

function LookupCard({ onFound }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function handleChange(e) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
    setCode(val)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (code.length < CODE_LENGTH) {
      setError('Please enter a full 6-character code.')
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    setError('')
    try {
      const client = await getClientByCode(code)
      onFound(client)
    } catch {
      setError('Code not found. Check your code and try again.')
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors" title="Home">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 8h1v5.5A1.5 1.5 0 0 0 4 15h2.5v-3.5h3V15H12a1.5 1.5 0 0 0 1.5-1.5V8h1a.5.5 0 0 0 .354-.854l-6-6Z"/>
            </svg>
            Home
          </Link>
        </div>
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1 text-center">Check your passes</h1>
          <p className="text-sm text-gray-400 text-center mb-7">Enter the 6-character code from your studio</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={code}
              onChange={handleChange}
              placeholder="XXXXXX"
              maxLength={CODE_LENGTH}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full text-center font-mono text-2xl font-bold tracking-[0.35em] border border-gray-200 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-200 placeholder:tracking-[0.35em] uppercase"
            />

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < CODE_LENGTH}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Looking up…
                </>
              ) : 'Check passes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Result ───────────────────────────────────────────────────────────────────

function PassCard({ product_name, remaining }) {
  const { label, color } = statusFor(remaining)
  const c   = palette[color]
  const pct = Math.min(Math.round((remaining / 10) * 100), 100)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{product_name}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{label}</span>
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-5xl font-black tabular-nums leading-none ${c.count}`}>
            {remaining}
          </span>
          <p className="text-sm text-gray-400 mb-1">
            {remaining === 1 ? 'pass remaining' : 'passes remaining'}
          </p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className={`h-2 rounded-full ${c.track} overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
            style={{ width: remaining === 0 ? '0%' : `${Math.max(pct, 3)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-300">0</span>
          <span className="text-xs text-gray-300">10+</span>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ client, onBack }) {
  const { name, passes } = client
  const hasWarning = passes.some(p => p.remaining <= 2)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header strip */}
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/>
              </svg>
              Check another
            </button>
          </div>

          {/* Name */}
          <div className="px-6 pt-6 pb-4 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Welcome back</p>
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
          </div>

          {/* Product cards */}
          <div className="px-4 pb-4 space-y-3">
            {passes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No passes assigned yet.</p>
            ) : (
              passes.map(p => (
                <PassCard key={p.product_name} product_name={p.product_name} remaining={p.remaining} />
              ))
            )}
          </div>

          {/* Footer warning */}
          {hasWarning && (
            <div className="border-t border-amber-100 bg-amber-50 px-6 py-4 text-center">
              <p className="text-sm font-medium text-amber-700">
                One or more passes are running low — contact your studio soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const [client, setClient] = useState(null)

  if (client) {
    return <ResultCard client={client} onBack={() => setClient(null)} />
  }
  return <LookupCard onFound={setClient} />
}
