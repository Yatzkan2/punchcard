import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import supabase from '../supabase'
import { getSettings, updateSettings } from '../lib/settings'
import LangToggle from '../components/shared/LangToggle'
import Topbar from '../components/shared/Topbar'

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'
const LABEL = 'block text-xs font-medium text-gray-500 mb-1'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

const DEFAULTS = {
  studio_name: '',
  client_app_url: '',
  admin_email: '',
  cancellation_cutoff_default: '12',
}

export default function AdminSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [session,  setSession]  = useState(null)
  const [values,   setValues]   = useState(DEFAULTS)
  const [original, setOriginal] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate('/admin', { replace: true })
      else setSession(data.session)
    })
  }, [navigate])

  useEffect(() => {
    if (!session) return
    getSettings()
      .then(s => {
        const merged = { ...DEFAULTS, ...s }
        setValues(merged)
        setOriginal(merged)
      })
      .catch(err => setError(err.message))
  }, [session])

  function set(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const changed = Object.fromEntries(
        Object.entries(values).filter(([k, v]) => original?.[k] !== v)
      )
      if (Object.keys(changed).length > 0) {
        await updateSettings(changed)
        setOriginal(prev => ({ ...prev, ...changed }))
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        title={t('dashboard.brand')}
        subtitle={values.studio_name || t('dashboard.studio')}
        nav={[
          <Link key="clients"  to="/admin"          className="text-xs text-gray-400 hover:text-gray-700 transition-colors">{t('dashboard.nav_clients')}</Link>,
          <Link key="schedule" to="/admin/schedule" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">{t('dashboard.nav_schedule')}</Link>,
          <span key="settings" className="text-xs font-medium text-indigo-600">{t('dashboard.nav_settings')}</span>,
        ]}
        langToggle={<LangToggle />}
        actions={[{ label: t('auth.sign_out'), onClick: () => supabase.auth.signOut() }]}
      />

      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-base font-semibold text-gray-900 mb-4">{t('settings.title')}</h1>

        <form onSubmit={handleSave} className="space-y-4">
          <Section title={t('settings.section_general')}>
            <Field label={t('settings.label_studio_name')}>
              <input
                type="text"
                value={values.studio_name}
                onChange={e => set('studio_name', e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label={t('settings.label_client_app_url')}>
              <input
                type="text"
                value={values.client_app_url}
                onChange={e => set('client_app_url', e.target.value)}
                className={INPUT}
              />
            </Field>
          </Section>

          <Section title={t('settings.section_notifications')}>
            <Field label={t('settings.label_admin_email')}>
              <input
                type="email"
                value={values.admin_email}
                onChange={e => set('admin_email', e.target.value)}
                className={INPUT}
              />
            </Field>
          </Section>

          <Section title={t('settings.section_scheduling')}>
            <Field
              label={t('settings.label_cancellation_cutoff_default')}
              hint={t('settings.hint_cancellation_cutoff')}
            >
              <input
                type="number"
                min={0}
                value={values.cancellation_cutoff_default}
                onChange={e => set('cancellation_cutoff_default', e.target.value)}
                className={INPUT}
              />
            </Field>
          </Section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">{t('settings.saved')}</span>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
