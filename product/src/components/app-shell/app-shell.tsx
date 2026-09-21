'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Command as CommandIcon,
  Home,
  LibraryBig,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { ContextualAssistantBoundary } from '@/components/assistant/contextual-assistant-boundary'
import { DocenteOsLockup, DocenteOsMark } from '@/components/brand/docente-os-brand'
import { cn } from '@/lib/utils'
import {
  NAVIGATION_GROUPS,
  SECONDARY_NAVIGATION_GROUPS,
  WORK_NAVIGATION_KEYS,
  navigationGroupItems,
  navigationItem,
  workNavigationItems,
  type NavigationGroup,
  type NavigationKey,
} from './navigation'

const ICONS: Record<NavigationKey, LucideIcon> = {
  home: Home,
  today: CheckCircle2,
  design: Sparkles,
  knowledge: LibraryBig,
  classes: UsersRound,
  timetable: CalendarClock,
  calendar: CalendarDays,
  'annual-plan': BookOpenCheck,
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
}

export function AppShell({
  active,
  academicYearLabel,
  workspaceName,
  role,
  children,
  contentClassName,
  contextualAssistantEnabled = true,
}: AppShellProps) {
  const router = useRouter()
  const [commandOpen, setCommandOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const activeItem = navigationItem(active)
  const secondaryActive = !WORK_NAVIGATION_KEYS.includes(active)

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
    setSecondaryOpen(false)
    router.push(href)
  }

  return (
    <div className="dosShell">
      <a className="dosSkipLink" href="#dos-main-content">Salta al contenuto</a>
      <aside className="dosSidebar" aria-label="Navigazione principale">
        <Link href="/" className="dosBrand" aria-label="Docente OS — Home">
          <DocenteOsLockup compact inverse academicYearLabel={academicYearLabel ?? 'Mantieni il filo.'} />
        </Link>

        <button className="dosCommandTrigger" type="button" onClick={() => setCommandOpen(true)}>
          <Search size={17} aria-hidden />
          <span>Cosa vuoi fare?</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="dosNavList">
          <div className="dosNavGroup">
            <span className="dosNavGroupLabel">Lavora</span>
            <div className="dosNavGroupItems">
              {workNavigationItems().map((item) => {
                const Icon = ICONS[item.key]
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn('dosNavItem', item.key === active && 'active')}
                    aria-current={item.key === active ? 'page' : undefined}
                    title={`${item.shortLabel} — ${item.description}`}
                  >
                    <Icon size={18} strokeWidth={1.9} aria-hidden />
                    <span>{item.shortLabel}</span>
                  </Link>
                )
              })}
              <button
                type="button"
                className={cn('dosNavItem', 'rowAction', secondaryActive && 'active')}
                aria-expanded={secondaryOpen}
                aria-label="Apri altre funzioni"
                title="Altre funzioni"
                onClick={() => setSecondaryOpen(true)}
              >
                <Menu size={18} strokeWidth={1.9} aria-hidden />
                <span>Altro</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="dosSidebarFooter">
          <span className="workspaceDot" aria-hidden />
          <div>
            <strong>{workspaceName}</strong>
            <span>{humanRole(role)}</span>
          </div>
        </div>
      </aside>

      <div className="dosMainColumn">
        <header className="dosMobileHeader">
          <div className="dosMobileContext">
            <Link href="/" aria-label="Docente OS — Home">
              <DocenteOsMark size={30} className="dosMobileBrandMark" />
            </Link>
            <span>{activeItem.label}</span>
            <strong>{workspaceName}</strong>
          </div>
          <div className="dosMobileActions">
            <button type="button" onClick={() => setCommandOpen(true)} aria-label="Cerca o vai a una funzione">
              <Search size={19} aria-hidden />
            </button>
            <button type="button" onClick={() => setSecondaryOpen(true)} aria-label="Apri altre funzioni">
              <Menu size={20} aria-hidden />
            </button>
          </div>
        </header>

        <main id="dos-main-content" tabIndex={-1} className={cn('workSurface', 'dosContent', contentClassName)}>{children}</main>

        <nav className="dosBottomNav" aria-label="Navigazione mobile">
          {WORK_NAVIGATION_KEYS.map((key) => {
            const item = navigationItem(key)
            const Icon = ICONS[key]
            return (
              <Link key={key} href={item.href} className={cn(key === active && 'active')} aria-current={key === active ? 'page' : undefined}>
                <Icon size={20} strokeWidth={1.9} aria-hidden />
                <small>{item.shortLabel}</small>
              </Link>
            )
          })}
          <button type="button" onClick={() => setSecondaryOpen(true)} className={cn(secondaryActive && 'active')} aria-expanded={secondaryOpen}>
            <Menu size={20} aria-hidden />
            <small>Altro</small>
          </button>
        </nav>
      </div>

      <ContextualAssistantBoundary active={active} enabled={contextualAssistantEnabled} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={navigate} />
      <SecondaryMenu open={secondaryOpen} onOpenChange={setSecondaryOpen} active={active} onNavigate={navigate} />
    </div>
  )
}

function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (href: string) => void
}) {
  return (
    <NavigationCommandDialog
      open={open}
      onOpenChange={onOpenChange}
      onNavigate={onNavigate}
      groups={NAVIGATION_GROUPS}
      title="Cerca o vai a una sezione"
      description="Scrivi ciò che vuoi fare e apri la funzione pertinente."
      placeholder="Cosa vuoi fare adesso?"
      empty="Nessun percorso trovato. Prova con un verbo: prepara, registra, cerca, organizza."
      footer="Docente OS apre il contesto; le modifiche restano nella superficie corretta."
      icon="search"
    />
  )
}

function SecondaryMenu({
  open,
  onOpenChange,
  active,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  active: NavigationKey
  onNavigate: (href: string) => void
}) {
  return (
    <NavigationCommandDialog
      open={open}
      onOpenChange={onOpenChange}
      onNavigate={onNavigate}
      groups={SECONDARY_NAVIGATION_GROUPS}
      title="Altre funzioni"
      description="Cerca tra le funzioni secondarie senza duplicare i percorsi di lavoro già visibili."
      placeholder="Cerca tra le altre funzioni…"
      empty="Nessuna funzione secondaria trovata."
      footer="Le funzioni principali restano Oggi, Classi e Orario. Materiali e progettazione si aprono dal compito quando servono."
      icon="menu"
      active={active}
    />
  )
}

function NavigationCommandDialog({
  open,
  onOpenChange,
  onNavigate,
  groups,
  title,
  description,
  placeholder,
  empty,
  footer,
  icon,
  active,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (href: string) => void
  groups: readonly NavigationGroup[]
  title: string
  description: string
  placeholder: string
  empty: string
  footer: string
  icon: 'search' | 'menu'
  active?: NavigationKey
}) {
  const LeadingIcon = icon === 'search' ? Search : Menu

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dosDialogOverlay" />
        <Dialog.Content className="dosCommandDialog" aria-describedby={`${icon}-navigation-description`}>
          <Dialog.Title className="srOnly">{title}</Dialog.Title>
          <p id={`${icon}-navigation-description`} className="srOnly">{description}</p>
          <Command className="dosCommand" label={title}>
            <div className="dosCommandInputRow">
              <LeadingIcon size={19} aria-hidden />
              <Command.Input autoFocus placeholder={placeholder} />
              {icon === 'menu' ? (
                <Dialog.Close className="dosSheetClose" aria-label="Chiudi altre funzioni"><X size={18} aria-hidden /></Dialog.Close>
              ) : (
                <span className="dosCommandShortcut">Esc</span>
              )}
            </div>
            <Command.List className="dosCommandList">
              <Command.Empty className="dosCommandEmpty">{empty}</Command.Empty>
              {groups.map((group) => (
                <Command.Group heading={group.label} key={group.key}>
                  {navigationGroupItems(group).map((item) => {
                    const Icon = ICONS[item.key]
                    return (
                      <Command.Item
                        key={item.key}
                        value={`${item.label} ${item.description} ${item.keywords.join(' ')}`}
                        onSelect={() => onNavigate(item.href)}
                        className="dosCommandItem"
                        aria-current={item.key === active ? 'page' : undefined}
                      >
                        <span className="dosCommandIcon"><Icon size={18} aria-hidden /></span>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <span className="dosCommandArrow" aria-hidden>↵</span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              ))}
            </Command.List>
            <div className="dosCommandFooter">
              <span><CommandIcon size={14} aria-hidden /> Cerca per intenzione</span>
              <span>{footer}</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function humanRole(role?: string | null) {
  if (!role || role === 'OWNER') return 'Spazio personale'
  if (role === 'TEACHER') return 'Docente'
  return role.toLowerCase().replaceAll('_', ' ')
}