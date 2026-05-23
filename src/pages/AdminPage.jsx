import { useState, useEffect, useRef } from 'react'
import supabase from '../supabase'
import { getAllClients, addClient as addClientFn, punchClient, updatePasses, removeClient } from '../lib/clients'

const UNAMBIGUOUS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode() {
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => UNAMBIGUOUS[b % UNAMBIGUOUS.length]).join('')
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

function Dialog({ title, children, confirmLabel = 'Confirm', danger = false, disabled = false, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
        <div>{children}</div>
        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            autoFocus
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              danger
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginCard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Admin</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to manage Punchcard</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client, onUpdate, onRemove }) {
  const [passes, setPasses]   = useState(client.passes)
  const [entries, setEntries] = useState(client.entries ?? 0)
  const [copied, setCopied]   = useState(false)
  const [busy, setBusy]       = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [editValue, setEditValue]   = useState(String(client.passes))
  const [dialog, setDialog]         = useState(null)  // null | { type }
  const [rowError, setRowError]     = useState('')
  const editInputRef = useRef(null)

  useEffect(() => {
    setPasses(client.passes)
    setEntries(client.entries ?? 0)
    if (!isEditing) setEditValue(String(client.passes))
  }, [client.passes, client.entries]) // eslint-disable-line react-hooks/exhaustive-deps

  const closeDialog = () => setDialog(null)

  // ── dialog openers ──────────────────────────────────────────────────────────

  function openPunch()  { if (passes > 0) setDialog({ type: 'punch' }) }
  function openRefill() { setDialog({ type: 'refill' }) }
  function openAdjust() { setDialog({ type: 'adjust' }) }
  function openRemove() { setDialog({ type: 'remove' }) }

  // ── confirmed actions ───────────────────────────────────────────────────────

  function showError(e) {
    setRowError(e?.message ?? 'Something went wrong.')
    setTimeout(() => setRowError(''), 4000)
  }

  async function confirmPunch() {
    closeDialog()
    setBusy(true)
    try { await punchClient(client.id, passes, entries); onUpdate() } catch (e) { showError(e) }
    setBusy(false)
  }

  async function confirmRefill() {
    closeDialog()
    setBusy(true)
    try { await updatePasses(client.id, 10); onUpdate() } catch (e) { showError(e) }
    setBusy(false)
  }

  async function confirmAdjust() {
    const val = Math.max(0, parseInt(editValue, 10) || 0)
    closeDialog()
    setBusy(true)
    try { await updatePasses(client.id, val); setIsEditing(false); onUpdate() } catch (e) { showError(e) }
    setBusy(false)
  }

  async function confirmRemove() {
    closeDialog()
    try { await removeClient(client.id); onRemove() } catch (e) { showError(e) }
  }

  // ── edit-mode helpers ────────────────────────────────────────────────────────

  function handleStartEdit() {
    setEditValue(String(passes))
    setIsEditing(true)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  function handleCancelEdit() {
    setEditValue(String(passes))
    setIsEditing(false)
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(client.code) } catch { return }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const passColor =
    passes === 0 ? 'text-red-600' :
    passes <= 2  ? 'text-amber-500' :
                   'text-gray-800'

  const adjustVal = Math.max(0, parseInt(editValue, 10) || 0)

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 flex-wrap sm:flex-nowrap">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-sm flex items-center justify-center shrink-0 select-none">
          {getInitials(client.name)}
        </div>

        {/* Name + code */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">{client.name}</p>
          <button
            onClick={handleCopy}
            className="mt-1 inline-flex items-center gap-1 font-mono text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded transition-colors"
            title="Click to copy"
          >
            {client.code}
            {copied ? (
              <svg className="w-3 h-3 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-700 leading-none">{entries}</p>
            <p className="text-xs text-gray-400 mt-0.5">entries</p>
          </div>
          <div className="text-center">
            {isEditing ? (
              <input
                ref={editInputRef}
                type="number"
                min={0}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') openAdjust(); if (e.key === 'Escape') handleCancelEdit() }}
                className="w-16 text-center border border-indigo-400 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <>
                <p className={`text-sm font-bold leading-none ${passColor}`}>{passes}</p>
                <p className="text-xs text-gray-400 mt-0.5">passes</p>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={openAdjust}
                disabled={busy}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openPunch}
                disabled={passes === 0 || busy}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {busy
                  ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  : <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>
                }
                Punch
              </button>
              <button
                onClick={openRefill}
                disabled={busy}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/></svg>
                Refill
              </button>
              <button
                onClick={handleStartEdit}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                Adjust
              </button>
            </>
          )}
          <button
            onClick={openRemove}
            className="text-gray-300 hover:text-red-500 transition-colors p-1.5"
            title="Remove client"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Row error */}
      {rowError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <p className="text-xs text-red-700">{rowError}</p>
        </div>
      )}

      {/* ── Punch confirm ── */}
      {dialog?.type === 'punch' && (
        <Dialog title="Use 1 pass" confirmLabel="Use Pass" onConfirm={confirmPunch} onCancel={closeDialog}>
          <p className="text-sm text-gray-500 mb-4">
            Recording a visit for {client.name}.
          </p>
          <div className="flex items-center justify-center gap-6 py-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-3xl font-semibold text-gray-300 leading-none">{passes}</p>
              <p className="text-xs text-gray-400 mt-1">now</p>
            </div>
            <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd"/>
            </svg>
            <div className="text-center">
              <p className={`text-3xl font-semibold leading-none ${
                passes - 1 === 0 ? 'text-red-500' : passes - 1 <= 2 ? 'text-amber-500' : 'text-indigo-600'
              }`}>{passes - 1}</p>
              <p className="text-xs text-gray-400 mt-1">after</p>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Refill ── */}
      {dialog?.type === 'refill' && (
        <Dialog title="Refill passes" confirmLabel="Refill to 10" onConfirm={confirmRefill} onCancel={closeDialog}>
          <p className="text-sm text-gray-500">
            Reset {client.name}'s passes back to 10?
          </p>
          {passes > 0 && (
            <p className="mt-1.5 text-xs text-gray-400">Current count: {passes}</p>
          )}
        </Dialog>
      )}

      {/* ── Adjust confirm ── */}
      {dialog?.type === 'adjust' && (
        <Dialog title="Adjust passes" confirmLabel="Confirm" onConfirm={confirmAdjust} onCancel={closeDialog}>
          <p className="text-sm text-gray-500">
            Set {client.name}'s passes to {adjustVal}?
          </p>
          {adjustVal !== passes && (
            <p className="mt-1.5 text-xs text-gray-400">
              This changes the count from {passes} to {adjustVal}.
            </p>
          )}
        </Dialog>
      )}

      {/* ── Remove confirm ── */}
      {dialog?.type === 'remove' && (
        <Dialog title="Remove client" confirmLabel="Remove" danger onConfirm={confirmRemove} onCancel={closeDialog}>
          <p className="text-sm text-gray-500">
            Permanently delete {client.name}? This cannot be undone.
          </p>
        </Dialog>
      )}
    </>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ session }) {
  const [clients, setClients] = useState([])
  const [fetchError, setFetchError] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [startPasses, setStartPasses] = useState(10)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addErrorFading, setAddErrorFading] = useState(false)

  useEffect(() => {
    if (!addError) return
    function dismiss() {
      setAddErrorFading(true)
      setTimeout(() => { setAddError(''); setAddErrorFading(false) }, 500)
    }
    const autoTimer = setTimeout(dismiss, 5000)
    const attachTimer = setTimeout(() => document.addEventListener('click', dismiss), 100)
    return () => {
      clearTimeout(autoTimer)
      clearTimeout(attachTimer)
      document.removeEventListener('click', dismiss)
    }
  }, [addError])

  async function fetchClients() {
    try {
      setFetchError('')
      setClients(await getAllClients())
    } catch (e) {
      setFetchError(e.message ?? 'Failed to load clients.')
    }
  }

  useEffect(() => { fetchClients() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const fullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ')
    if (!/\p{L}/u.test(fullName)) {
      setAddError('Name must contain at least one letter.')
      return
    }
    const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
    const duplicate = clients.some(c => norm(c.name) === norm(fullName))
    if (duplicate) {
      setAddError(`${fullName} is already a client.`)
      return
    }
    setAdding(true)
    setAddError('')
    try {
      await addClientFn(fullName, startPasses, generateCode())
      setFirstName('')
      setLastName('')
      setStartPasses(10)
      await fetchClients()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const [search, setSearch] = useState('')

  const filteredClients = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

  const totalClients = clients.length
  const activePasses = clients.filter(c => c.passes > 0).length
  const needRenewal  = clients.filter(c => c.passes <= 2).length

  const stats = [
    { label: 'Total clients', value: totalClients },
    { label: 'Active passes', value: activePasses },
    { label: 'Need renewal',  value: needRenewal,  alert: needRenewal > 0 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">Punchcard</span>
          <span className="text-xs text-gray-400">studioNitzk</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block truncate max-w-48">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, alert }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${alert ? 'text-amber-500' : 'text-gray-900'}`}>
                {value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Add client */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add client</p>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <input
              type="number"
              placeholder="Passes"
              value={startPasses}
              min={0}
              onChange={e => setStartPasses(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full sm:w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          {addError && (
            <div className={`overflow-hidden transition-all duration-500 ${addErrorFading ? 'max-h-0 mt-0 opacity-0' : 'max-h-24 mt-3 opacity-100'}`}>
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p className="text-sm text-red-700">{addError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Client list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Clients</p>
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
              </svg>
              <input
                type="text"
                placeholder="Search clients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {search.trim() ? `${filteredClients.length} / ${clients.length}` : `${clients.length} total`}
            </span>
          </div>
          {fetchError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-600 font-medium mb-1">Could not load clients</p>
              <p className="text-xs text-gray-400 mb-4">{fetchError}</p>
              <button
                onClick={fetchClients}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : clients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No clients yet.</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No clients match "{search}".</p>
          ) : (
            filteredClients.map(client => (
              <ClientRow
                key={client.id}
                client={client}
                onUpdate={fetchClients}
                onRemove={fetchClients}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null  // initial load — avoid flash
  if (!session) return <LoginCard />
  return <Dashboard session={session} />
}
