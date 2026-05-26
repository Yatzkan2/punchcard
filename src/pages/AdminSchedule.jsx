import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import supabase from '../supabase'
import WeekNav from '../components/shared/WeekNav'
import SlotForm from '../components/admin/SlotForm'
import SlotList from '../components/admin/SlotList'
import AttendancePanel from '../components/admin/AttendancePanel'
import LangToggle from '../components/shared/LangToggle'
import Topbar from '../components/shared/Topbar'

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

export default function AdminSchedule() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [session,      setSession]      = useState(null)
  const [weekStart,    setWeekStart]    = useState(() => mondayOf(new Date()))
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [editingSlot,  setEditingSlot]  = useState(null)
  const [listKey,      setListKey]      = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/admin', { replace: true })
      else setSession(data.session)
    })
  }, [navigate])

  useEffect(() => {
    if (!editingSlot) return
    const onKey = e => { if (e.key === 'Escape') setEditingSlot(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editingSlot])

  if (!session) return null

  function prevWeek() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
    setSelectedSlot(null)
    setEditingSlot(null)
  }

  function nextWeek() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
    setSelectedSlot(null)
    setEditingSlot(null)
  }

  function handleSlotCreated(slot) {
    setListKey(k => k + 1)
    setSelectedSlot(slot)
  }

  function handleSlotSaved() {
    setListKey(k => k + 1)
    setEditingSlot(null)
  }

  function handleSlotDeleted() {
    setListKey(k => k + 1)
    setEditingSlot(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        title={t('dashboard.brand')}
        subtitle={t('dashboard.studio')}
        nav={[
          <Link key="clients" to="/admin" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">{t('dashboard.nav_clients')}</Link>,
          <span key="schedule" className="text-xs font-medium text-indigo-600">{t('dashboard.nav_schedule')}</span>,
        ]}
        actions={[
          <span key="email" className="text-xs text-gray-400 truncate max-w-48">{session.user.email}</span>,
          <LangToggle key="lang" />,
          { label: t('auth.sign_out'), onClick: () => supabase.auth.signOut() },
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-semibold text-gray-900">{t('dashboard.nav_schedule')}</h1>
          <WeekNav startDate={weekStart} onPrev={prevWeek} onNext={nextWeek} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Slot list — takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <SlotList key={listKey} weekStart={weekStart} onEdit={setEditingSlot} />
          </div>

          {/* Sidebar: create form + attendance panel */}
          <div className="space-y-4">
            <SlotForm onCreated={handleSlotCreated} />
            {selectedSlot && (
              <AttendancePanel slot={selectedSlot} />
            )}
          </div>
        </div>
      </main>

      {/* Edit slot modal */}
      {editingSlot && (
        <div
          className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setEditingSlot(null) }}
        >
          <div className="animate-modal-content w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl">
            <SlotForm
              key={editingSlot.id}
              slot={editingSlot}
              onSaved={handleSlotSaved}
              onDeleted={handleSlotDeleted}
              onCancel={() => setEditingSlot(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
