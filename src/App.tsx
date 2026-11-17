import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { ClerkProvider } from '@clerk/react'
import { ptBR } from '@clerk/localizations'
import { clerkConfigured, clerkKey } from './lib/supabase'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Layout from './components/Layout'
import { ConfirmProvider, Spinner, ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import { db } from './lib/db'
import { startSync } from './lib/sync'
import { seedDefaultWorkouts } from './lib/seed'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Plan = lazy(() => import('./pages/Plan'))
const Treinos = lazy(() => import('./pages/Treinos'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const History = lazy(() => import('./pages/History'))
const Profile = lazy(() => import('./pages/Profile'))
const Run = lazy(() => import('./pages/Run'))

function ThemeSync() {
  const profile = useLiveQuery(() => db.profiles.get('me'), [], undefined)
  const theme = profile?.theme ?? 'system'
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141015' : '#e0529c')
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  return null
}

function Gate() {
  const { ready, user, configured, localMode } = useAuth()
  useEffect(() => { startSync() }, [])
  const canSeed = ready && (!configured || !!user || localMode)
  useEffect(() => { if (canSeed) void seedDefaultWorkouts() }, [canSeed, user?.id])
  if (!ready) return <Spinner />
  if (configured && !user && !localMode) return <Login />
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/treino/:id" element={<Run />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="plano" element={<Plan />} />
          <Route path="treinos" element={<Treinos />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="historico" element={<History />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function Clerk({ children }: { children: ReactNode }) {
  if (!clerkConfigured) return <>{children}</>
  return (
    <ClerkProvider publishableKey={clerkKey!} localization={ptBR} appearance={{ variables: { colorPrimary: '#e0529c', borderRadius: '0.75rem' } }}>
      {children}
    </ClerkProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <Clerk>
            <AuthProvider>
              <ThemeSync />
              <Gate />
            </AuthProvider>
          </Clerk>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
