'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { BookOpenCheck, CalendarClock, CalendarDays, CheckCircle2, Command as CommandIcon, FileText, LibraryBig, ListTodo, Menu, Search, Settings2, ShieldCheck, Sparkles, UsersRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { ContextualAssistantBoundary } from '@/components/assistant/contextual-assistant-boundary'
import { LocalProfileAvatar } from '@/components/local-user-profile/local-user-profile'
import { DocenteOsLockup, DocenteOsMark } from '@/components/brand/docente-os-brand'
import { cn } from '@/lib/utils'
import { NAVIGATION_GROUPS, isSecondaryNavigationKey, navigationGroupItems, navigationItem, workNavigationItems, type NavigationGroup, type NavigationKey } from './navigation'

const ICONS: Record<NavigationKey, LucideIcon> = {
  today: CheckCircle2,
  timetable: CalendarClock,
  classes: UsersRound,
  more: Menu,
  activities: ListTodo,
  design: Sparkles,
  'annual-plan': BookOpenCheck,
  knowledge: LibraryBig,
  calendar: CalendarDays,
  documentation: FileText,
  settings: Settings2,
  account: ShieldCheck,
}

export type AppShellProps = {
  active: NavigationKey
  academicYearLabel?: string | null
  workspaceName: string
  role?: string | null
  children: ReactNode
  contentClassName?: string
  contextualAssistantEnabled?: boolean
  focusMode?: boolean
  mobileContextLabel?: string
  mobileNavigationActive?: NavigationKey | null
}

export function AppShell({
  active,
  academicYearLabel,
  workspaceName,
  role,
  children,
  contentClassName,
  contextualAssistantEnabled = true,
  focusMode = false,
  mobileContextLabel,
  mobileNavigationActive,
}: AppShellProps) {
  const router = useRouter()
  const [commandOpen, setCommandOpen] = useState(false)
  const activeItem = navigationItem(active)
  const moreActive = active === 'more' || isSecondaryNavigationKey(active)
  const mobileActive = mobileNavigationActive === undefined ? active : mobileNavigationActive
  const mobileMoreActive = mobileActive === 'more' || (mobileActive !== null && isSecondaryNavigationKey(mobileActive))
  const primaryNavigation = workNavigationItems()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const navigate = (href: string) => {
    setCommandOpen(false)
    router.push(href)
  }

  return <div className={cn('dosShell', focusMode && 'dosShellFocused', contextualAssistantEnabled && 'dosShellAssistantEnabled')}>
    <a className="dosSkipLink" href="#dos-main-content">Salta al contenuto</a>
    <aside className="dosSidebar" aria-label="Navigazione principale">
      <Link href="/planner" className="dosBrand" aria-label="Docente OS — Oggi">
        <DocenteOsLockup compact inverse academicYearLabel={academicYearLabel ?? 'Mantieni il filo.'} />
      </Link>
      <button className="dosCommandTrigger" type="button" onClick={() => setCommandOpen(true)}>
        <Search size={17} aria-hidden /><span>Cosa vuoi fare?</span><kbd>⌘K</kbd>
      </button>
      <nav className="dosNavList">
        <div className="dosNavGroup">
          <span className="dosNavGroupLabel">Lavora</span>
          <div className="dosNavGroupItems">
            {primaryNavigation.map((item) => {
              const Icon = ICONS[item.key]
              const itemActive = item.key === active || (item.key === 'more' && moreActive)
              return <Link key={item.key} href={item.href} className={cn('dosNavItem', itemActive && 'active')} aria-current={itemActive ? 'page' : undefined} title={`${item.shortLabel} — ${item.description}`}>
                <Icon size={18} strokeWidth={1.9} aria-hidden /><span>{item.shortLabel}</span>
              </Link>
            })}
          </div>
        </div>
      </nav>
      <div className="dosSidebarFooter"><span className="workspaceDot" aria-hidden /><div><strong>{workspaceName}</strong><span>{humanRole(role)}</span></div></div>
    </aside>
    <div className="dosMainColumn">
      <header className="dosMobileHeader">
        <div className="dosMobileContext"><Link href="/planner" aria-label="Docente OS — Oggi"><DocenteOsMark size={30} className="dosMobileBrandMark" /></Link><span>{mobileContextLabel ?? activeItem.label}</span><strong>{workspaceName}</strong></div>
        <div className="dosMobileActions"><button type="button" onClick={() => setCommandOpen(true)} aria-label="Cerca o vai a una funzione"><Search size={19} aria-hidden /></button><LocalProfileAvatar /></div>
      </header>
      <main id="dos-main-content" tabIndex={-1} className={cn('workSurface', 'dosContent', contentClassName)}>{children}</main>
      <nav className="dosBottomNav" aria-label="Navigazione mobile">
        {primaryNavigation.map((item) => {
          const Icon = ICONS[item.key]
          const itemActive = item.key === mobileActive || (item.key === 'more' && mobileMoreActive)
          return <Link key={item.key} href={item.href} className={cn(itemActive && 'active')} aria-current={itemActive ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.9} aria-hidden /><small>{item.shortLabel}</small>
          </Link>
        })}
      </nav>
    </div>
    <ContextualAssistantBoundary active={active} enabled={contextualAssistantEnabled} />
    <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={navigate} />
  </div>
}

function CommandPalette({ open, onOpenChange, onNavigate }: { open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (href: string) => void }) {
  return <NavigationCommandDialog
    open={open}
    onOpenChange={onOpenChange}
    onNavigate={onNavigate}
    groups={NAVIGATION_GROUPS}
    title="Cerca o vai a una sezione"
    description="Scrivi ciò che vuoi fare e apri direttamente la funzione pertinente."
    placeholder="Cosa vuoi fare adesso?"
    empty="Nessun percorso trovato. Prova con un verbo: prepara, registra, cerca, organizza."
    footer="Oggi, Orario, Classi e Altro organizzano il lavoro senza cambiare l’autorità dei dati."
  />
}

function NavigationCommandDialog({ open, onOpenChange, onNavigate, groups, title, description, placeholder, empty, footer }: { open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (href: string) => void; groups: readonly NavigationGroup[]; title: string; description: string; placeholder: string; empty: string; footer: string }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dosDialogOverlay" />
      <Dialog.Content className="dosCommandDialog" aria-describedby="search-navigation-description">
        <Dialog.Title className="srOnly">{title}</Dialog.Title>
        <p id="search-navigation-description" className="srOnly">{description}</p>
        <Command className="dosCommand" label={title}>
          <div className="dosCommandInputRow"><Search size={19} aria-hidden /><Command.Input autoFocus placeholder={placeholder} /><span className="dosCommandShortcut">Esc</span></div>
          <Command.List className="dosCommandList">
            <Command.Empty className="dosCommandEmpty">{empty}</Command.Empty>
            {groups.map((group) => <Command.Group heading={group.label} key={group.key}>
              {navigationGroupItems(group).map((item) => {
                const Icon = ICONS[item.key]
                return <Command.Item key={item.key} value={`${item.label} ${item.description} ${item.keywords.join(' ')}`} onSelect={() => onNavigate(item.href)} className="dosCommandItem">
                  <span className="dosCommandIcon"><Icon size={18} aria-hidden /></span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <span className="dosCommandArrow" aria-hidden>↵</span>
                </Command.Item>
              })}
            </Command.Group>)}
          </Command.List>
          <div className="dosCommandFooter"><span><CommandIcon size={14} aria-hidden /> Cerca per intenzione</span><span>{footer}</span></div>
        </Command>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function humanRole(role?: string | null) {
  if (!role || role === 'OWNER') return 'Spazio personale'
  if (role === 'TEACHER') return 'Docente'
  return role.toLowerCase().replaceAll('_', ' ')
}
