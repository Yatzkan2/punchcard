import './i18n.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { SettingsProvider } from './lib/SettingsContext.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AdminSchedule from './pages/AdminSchedule.jsx'
import AdminActivity from './pages/AdminActivity.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import ClientPage from './pages/ClientPage.jsx'
import HomePage from './pages/HomePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/schedule" element={<AdminSchedule />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/activity" element={<AdminActivity />} />
        <Route path="/client" element={<ClientPage />} />
      </Routes>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
