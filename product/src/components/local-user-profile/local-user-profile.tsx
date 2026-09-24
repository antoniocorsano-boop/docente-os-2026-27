'use client'

import { UserRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'DOCENTE_OS_LOCAL_PROFILE_V1'
const PROFILE_EVENT = 'docente-os-local-profile-change'
const MAX_DISPLAY_NAME = 160

export type LocalTeacherProfileV1 = {
  version: 1
  displayName: string
}

const EMPTY_PROFILE: LocalTeacherProfileV1 = { version: 1, displayName: '' }

export function LocalTeacherProfileCard() {
  const profile = useLocalTeacherProfile()

  return (
    <LocalTeacherProfileEditor
      key={profile.displayName}
      initialDisplayName={profile.displayName}
      hasSavedProfile={Boolean(profile.displayName)}
    />
  )
}

function LocalTeacherProfileEditor({
  initialDisplayName,
  hasSavedProfile,
}: {
  initialDisplayName: string
  hasSavedProfile: boolean
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [notice, setNotice] = useState<'saved' | 'cleared' | null>(null)

  const save = () => {
    const normalized = normalizeDisplayName(displayName)
    writeLocalTeacherProfile({ version: 1, displayName: normalized })
    setDisplayName(normalized)
    setNotice('saved')
  }

  const clear = () => {
    clearLocalTeacherProfile()
    setDisplayName('')
    setNotice('cleared')
  }

  return (
    <section className="settingsCard" id="profilo-locale" aria-labelledby="local-profile-title">
      <div className="settingsCardHeading">
        <span>01A</span>
        <div>
          <h2 id="local-profile-title">Tu · profilo locale</h2>
          <p>Come vuoi essere chiamato su questo dispositivo?</p>
        </div>
        <span className="settingsSectionStatus status-optional">Locale</span>
      </div>

      <details className="settingsContextDisclosure">
        <summary><span aria-hidden>ⓘ</span> Come viene usato</summary>
        <div className="settingsContextDisclosureBody">
          <div><span>Serve a</span><strong>Personalizzare saluto e avatar.</strong></div>
          <div><span>Dove resta</span><strong>Solo in questo browser/dispositivo.</strong></div>
          <div><span>Non modifica</span><strong>Account, autorizzazioni, scuola, classi, Orario o documenti istituzionali.</strong></div>
        </div>
      </details>

      <div className="settingsFormBlock">
        <div className="settingsGrid twoCols">
          <label className="settingsField wideField">
            <span>Nome visualizzato</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={MAX_DISPLAY_NAME}
              autoComplete="off"
              placeholder="Es. Antonio"
            />
          </label>
        </div>
        <div className="settingsActionRow">
          <span>Resta su questo dispositivo. Non viene inviato al server.</span>
          <div className="localProfileActions">
            {hasSavedProfile ? <button className="textButton" type="button" onClick={clear}>Azzera</button> : null}
            <button className="settingsPrimaryButton" type="button" onClick={save}>Salva sul dispositivo</button>
          </div>
        </div>
        <p className="srOnly" aria-live="polite">
          {notice === 'saved' ? 'Profilo locale salvato sul dispositivo.' : notice === 'cleared' ? 'Profilo locale azzerato.' : ''}
        </p>
      </div>
    </section>
  )
}

export function LocalProfileAvatar() {
  const profile = useLocalTeacherProfile()
  const initials = useMemo(() => localProfileInitials(profile.displayName), [profile.displayName])
  const label = profile.displayName
    ? `Apri profilo locale di ${profile.displayName}`
    : 'Apri profilo locale'

  return (
    <Link className="dosLocalProfileAvatar" href="/impostazioni#profilo-locale" aria-label={label} title={label}>
      {initials ? <span aria-hidden>{initials}</span> : <UserRound size={19} aria-hidden />}
    </Link>
  )
}

export function LocalTeacherGreeting({ className }: { className?: string }) {
  const profile = useLocalTeacherProfile()
  const greeting = localGreeting(new Date())
  return <span className={className}>{profile.displayName ? `${greeting}, ${profile.displayName}` : greeting}</span>
}

export function useLocalTeacherProfile() {
  const [profile, setProfile] = useState<LocalTeacherProfileV1>(EMPTY_PROFILE)

  useEffect(() => {
    const refresh = () => setProfile(readLocalTeacherProfile())
    const storage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) refresh()
    }

    refresh()
    window.addEventListener('storage', storage)
    window.addEventListener(PROFILE_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', storage)
      window.removeEventListener(PROFILE_EVENT, refresh)
    }
  }, [])

  return profile
}

export function readLocalTeacherProfile(): LocalTeacherProfileV1 {
  if (typeof window === 'undefined') return EMPTY_PROFILE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PROFILE
    const parsed = JSON.parse(raw) as Partial<LocalTeacherProfileV1>
    if (parsed.version !== 1 || typeof parsed.displayName !== 'string') return EMPTY_PROFILE
    return { version: 1, displayName: normalizeDisplayName(parsed.displayName) }
  } catch {
    return EMPTY_PROFILE
  }
}

export function writeLocalTeacherProfile(profile: LocalTeacherProfileV1) {
  if (typeof window === 'undefined') return
  const normalized: LocalTeacherProfileV1 = {
    version: 1,
    displayName: normalizeDisplayName(profile.displayName),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new Event(PROFILE_EVENT))
}

export function clearLocalTeacherProfile() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(PROFILE_EVENT))
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME)
}

export function localProfileInitials(value: string) {
  const parts = normalizeDisplayName(value).split(' ').filter(Boolean)
  if (!parts.length) return ''
  return parts.slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('it-IT') ?? '').join('')
}

export function localGreeting(date: Date) {
  const hour = Number(new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  }).format(date))
  if (hour < 13) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}
