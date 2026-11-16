import type { Session } from '@supabase/supabase-js'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Button, inputCls, Spinner, Wordmark } from './ui'

/**
 * Sin Supabase → deja pasar (modo demo).
 * Con Supabase → pide email y contraseña. Es una app de un solo usuario: después de crear
 * tu cuenta conviene desactivar los registros nuevos en Supabase (ver README).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <>{children}</>
  if (session === undefined)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    )
  if (!session) return <AuthScreen />
  return <>{children}</>
}

function AuthScreen() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    const res =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (res.error) setMsg(res.error.message)
    else if (mode === 'up' && !res.data.session) setMsg(t('auth.checkEmail'))
  }

  return (
    <div className="pt-safe flex min-h-dvh flex-col justify-between px-6 pb-10">
      <div className="pt-20">
        <Wordmark className="text-[34px]" />
        <p className="mt-3 text-[17px] text-muted">{t('auth.tagline')}</p>
      </div>
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-3">
        <input className={inputCls} type="email" autoComplete="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          className={inputCls}
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {msg && <p className="px-1 text-[13px] text-muted">{msg}</p>}
        <Button size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
        </Button>
        <button type="button" className="w-full py-2 text-[13px] text-muted" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? t('auth.toSignUp') : t('auth.toSignIn')}
        </button>
      </form>
    </div>
  )
}
