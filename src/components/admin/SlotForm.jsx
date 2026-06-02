import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getProducts } from '../../lib/products'
import { getClientsWithPass } from '../../lib/passes'
import { registerClient, unregisterClient } from '../../lib/registrations'
import { createSlot, updateSlot, deleteSlot } from '../../lib/slots'
import { getSetting } from '../../lib/settings'
import Dialog from './Dialog'
import Spinner from '../shared/Spinner'
import TrashIcon from '../shared/TrashIcon'

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
const LABEL = 'block text-xs font-medium text-gray-500 mb-1'

function today() {
  return new Date().toISOString().split('T')[0]
}

function slotToFields(slot) {
  const d = new Date(slot.starts_at)
  return {
    date:                    d.toLocaleDateString('en-CA'),
    time:                    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    productId:               slot.product_id ?? '',
    capacity:                slot.capacity,
    notes:                   slot.notes ?? '',
    cancellationCutoffHours: slot.cancellation_cutoff_hours ?? 0,
  }
}

// slot prop = edit mode; omit for create mode
export default function SlotForm({ slot, onCreated, onSaved, onCancel, onDeleted }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'he' ? 'he-IL' : 'en-GB'
  const isEdit = !!slot

  const init = isEdit ? slotToFields(slot) : { date: today(), time: '09:00', productId: '', capacity: 10, notes: '', cancellationCutoffHours: 12 }

  const [date,                    setDate]                    = useState(init.date)
  const [time,                    setTime]                    = useState(init.time)
  const [productId,               setProductId]               = useState(init.productId)
  const [capacity,                setCapacity]                = useState(init.capacity)
  const [notes,                   setNotes]                   = useState(init.notes)
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState(init.cancellationCutoffHours)
  const [products,  setProducts]  = useState([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Delete state (edit mode only)
  const [confirmingDelete,  setConfirmingDelete]  = useState(false)
  const [deleting,          setDeleting]          = useState(false)

  // Unregister confirmation state (edit mode only)
  const [pendingUnregister, setPendingUnregister] = useState(null) // { clientId, registrationId, name }

  // Registration state (edit mode only)
  const [registrations,    setRegistrations]    = useState(slot?.slot_registrations ?? [])
  const [eligibleClients,  setEligibleClients]  = useState(null)
  const [loadingClients,   setLoadingClients]   = useState(false)
  const [regBusy,          setRegBusy]          = useState({})
  const [regError,         setRegError]         = useState('')

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (isEdit) return
    getSetting('cancellation_cutoff_default')
      .then(val => {
        const n = parseInt(val, 10)
        if (!isNaN(n)) setCancellationCutoffHours(n)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        const starts_at = new Date(`${date}T${time}`).toISOString()
        const updated = await updateSlot(slot.id, {
          starts_at,
          product_id:                productId || null,
          capacity:                  Number(capacity),
          notes:                     notes.trim() || null,
          cancellation_cutoff_hours: Number(cancellationCutoffHours),
        })
        onSaved?.(updated)
      } else {
        const created = await createSlot(date, time, productId || null, Number(capacity), notes.trim() || null, Number(cancellationCutoffHours))
        setDate(today())
        setTime('09:00')
        setProductId('')
        setCapacity(10)
        setNotes('')
        setCancellationCutoffHours(12)
        onCreated?.(created)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete (edit mode) ────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSlot(slot.id)
      onDeleted?.()
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  // ── Registration helpers (edit mode) ──────────────────────────────────────

  async function fetchEligible() {
    if (eligibleClients !== null || !slot.product_id || loadingClients) return
    setLoadingClients(true)
    try {
      setEligibleClients(await getClientsWithPass(slot.product_id))
    } catch (err) {
      setRegError(err.message)
    } finally {
      setLoadingClients(false)
    }
  }

  const registeredIds      = new Set(registrations.map(r => r.clients?.id).filter(Boolean))
  const unregisteredClients = eligibleClients?.filter(c => !registeredIds.has(c.id)) ?? []
  const full               = registrations.length >= Number(capacity)

  async function handleRegister(clientId) {
    const client = eligibleClients?.find(c => c.id === clientId)
    if (!client) return
    setRegBusy(b => ({ ...b, [clientId]: true }))
    setRegError('')
    try {
      const reg = await registerClient(slot.id, clientId)
      setRegistrations(prev => [...prev, { id: reg.id, attended: false, clients: { id: client.id, name: client.name } }])
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegBusy(b => ({ ...b, [clientId]: false }))
    }
  }

  async function confirmUnregister() {
    const { clientId, registrationId } = pendingUnregister
    setPendingUnregister(null)
    setRegBusy(b => ({ ...b, [clientId]: true }))
    setRegError('')
    try {
      await unregisterClient(slot.id, clientId)
      setRegistrations(prev => prev.filter(r => r.id !== registrationId))
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegBusy(b => ({ ...b, [clientId]: false }))
    }
  }

  return (
    <>
    {pendingUnregister && (
      <Dialog
        title={t('schedule.unregister_title')}
        confirmLabel={t('schedule.unregister_confirm')}
        danger
        onConfirm={confirmUnregister}
        onCancel={() => setPendingUnregister(null)}
      >
        <p className="text-sm text-gray-500">
          {t('schedule.unregister_body', { name: pendingUnregister.name })}
        </p>
      </Dialog>
    )}
    {confirmingDelete && (
      <Dialog
        title={t('schedule.delete_title')}
        confirmLabel={t('schedule.delete_confirm')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      >
        <p className="text-sm text-gray-500">
          {t('schedule.delete_body', {
            datetime: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(slot.starts_at)),
          })}
        </p>
      </Dialog>
    )}

    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {isEdit ? t('schedule.edit_slot') : t('schedule.new_slot')}
        </p>
        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={deleting}
              className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
              title={t('schedule.delete')}
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {t('passes.cancel')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className={LABEL}>{t('schedule.label_date')}</label>
          <input type="date" dir="ltr" value={date} onChange={e => setDate(e.target.value)} required className={INPUT} />
        </div>
        <div className="min-w-0">
          <label className={LABEL}>{t('schedule.label_time')}</label>
          <input type="time" dir="ltr" value={time} onChange={e => setTime(e.target.value)} required className={INPUT} />
        </div>
      </div>

      <div>
        <label className={LABEL}>{t('schedule.label_activity')}</label>
        <select value={productId} onChange={e => setProductId(e.target.value)} className={INPUT}>
          <option value="">{t('schedule.activity_none')}</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL}>{t('schedule.label_capacity')}</label>
        <input
          type="number" min={1} max={999} value={capacity}
          onChange={e => setCapacity(e.target.value)} required className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL}>{t('schedule.cancellation_cutoff_label')}</label>
        <input
          type="number" min={0} value={cancellationCutoffHours}
          onChange={e => setCancellationCutoffHours(e.target.value)} required className={INPUT}
        />
        <p className="text-xs text-gray-400 mt-1">{t('schedule.cancellation_cutoff_hint')}</p>
      </div>

      <div>
        <label className={LABEL}>{t('schedule.label_notes')} <span className="font-normal text-gray-400">{t('schedule.optional')}</span></label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={2} placeholder={t('schedule.notes_placeholder')} className={`${INPUT} resize-none`}
        />
      </div>

      {/* Participants — edit mode only */}
      {isEdit && slot.product_id && (
        <div>
          <label className={LABEL}>
            {t('schedule.participants')}
            <span className="font-normal text-gray-400 ms-1">{registrations.length}/{capacity}</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {registrations.map(r => r.clients && (
              <span key={r.id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 rounded-full px-2 py-0.5">
                {r.clients.name}
                {regBusy[r.clients.id] ? (
                  <Spinner className="w-3 h-3" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingUnregister({ clientId: r.clients.id, registrationId: r.id, name: r.clients.name })}
                    className="text-indigo-300 hover:text-red-500 transition-colors leading-none ml-0.5"
                    aria-label="Remove"
                  >×</button>
                )}
              </span>
            ))}

            {!full && (
              <select
                defaultValue=""
                onFocus={fetchEligible}
                onChange={e => { if (e.target.value) { handleRegister(e.target.value); e.target.value = '' } }}
                disabled={loadingClients}
                className="text-xs text-indigo-500 bg-transparent border border-dashed border-indigo-200 rounded-full px-2 py-0.5 outline-none cursor-pointer hover:border-indigo-400 transition-colors disabled:opacity-50"
              >
                <option value="">{loadingClients ? t('schedule.loading') : t('schedule.add_client')}</option>
                {unregisteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          {regError && <p className="text-xs text-red-500 mt-1">{regError}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit" disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving && <Spinner className="w-4 h-4" />}
        {saving ? (isEdit ? t('schedule.saving') : t('schedule.creating')) : (isEdit ? t('schedule.save') : t('schedule.create'))}
      </button>
    </form>
    </>
  )
}
