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
  Sparkles,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'
import { ContextualAssistantBoundary } from '@/components/assistant/contextual-assistant-boundary'
import { cn } from '@/lib/utils'
import {
  NAVIGATION_GROUPS,
  navigationGroupItems,
  navigationItem,
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
}

const MOBILE_PRIMARY: NavigationKey[] = ['home', 'today', 'timetable', 'classes']

export type AppShellProps = {
  active: NavigationKey
  academicYearLabel?: string | null
  workspaceName: string
  role?: string | null
  children: ReactNode
  contentClassName?: string
}

export function AppShell({
  active,
  academicYearLabel,
  workspaceName,
  role,
  children,
  contentClassName,
}: AppShellProps) {
  const router = useRouter()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeItem = navigationItem(active)

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
    setMobileMenuOpen(false)
    router.push(href)
  }

  return (
    <div className="dosShell">
      <aside className="dosSidebar" aria-label="Navigazione principale">
        <Link href="/" className="dosBrand" aria-label="DOCENTE OS — Home">
          <span className="dosBrandMark" aria-hidden>D</span>
          <span className="dosBrandText">
            <strong>DOCENTE OS</strong>
            <small>{academicYearLabel ?? 'Anno da configurare'}</small>
          </span>
        </Link>

        <button className="dosCommandTrigger" type="button" onClick={() => setCommandOpen(true)}>
          <Search size={17} aria-hidden />
          <span>Cosa vuoi fare?</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="dosNavList">
          {NAVIGATION_GROUPS.map((group) => (
            <div className="dosNavGroup" key={group.key}>
              <span className="dosNavGroupLabel">{group.label}</span>
              <div className="dosNavGroupItems">
                {navigationGroupItems(group).map((item) => {
                  const Icon = ICONS[item.key]
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn('dosNavItem', item.key === active && 'active')}
                      aria-current={item.key === active ? 'page' : undefined}
                      title={`${item.label} — ${item.description}`}
                    >
                      <Icon size={18} strokeWidth={1.9} aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
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
            <span>{activeItem.label}</span>
            <strong>{workspaceName}</strong>
          </div>
          <div className="dosMobileActions">
            <button type="button" onClick={() => setCommandOpen(true)} aria-label="Cerca o vai a una funzione">
              <Search size={19} aria-hidden />
            </button>
            <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Apri tutte le sezioni">
              <Menu size={20} aria-hidden />
            </button>
          </div>
        </header>

        <main className={cn('workSurface', 'dosContent', contentClassName)}>{children}</main>

        <nav className="dosBottomNav" aria-label="Navigazione mobile">
          {MOBILE_PRIMARY.map((key) => {
            const item = navigationItem(key)
            const Icon = ICONS[key]
            return (
              <Link key={key} href={item.href} className={cn(key === active && 'active')} aria-current={key === active ? 'page' : undefined}>
                <Icon size={20} strokeWidth={1.9} aria-hidden />
                <small>{item.shortLabel}</small>
              </Link>
            )
          })}
          <button type="button" onClick={() => setMobileMenuOpen(true)} className={cn(!MOBILE_PRIMARY.includes(active) && 'active')}>
            <Menu size={20} aria-hidden />
            <small>Altro</small>
          </button>
        </nav>
      </div>

      <ContextualAssistantBoundary active={active} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={navigate} />
      <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} active={active} onNavigate={navigate} academicYearLabel={academicYearLabel} />
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dosDialogOverlay" />
        <Dialog.Content className="dosCommandDialog" aria-describedby="command-description">
          <Dialog.Title className="srOnly">Cerca o vai a una sezione</Dialog.Title>
          <p id="command-description" className="srOnly">Scrivi ciò che vuoi fare e apri la funzione pertinente.</p>
          <Command className="dosCommand" label="Cerca nelle funzioni di DOCENTE OS">
            <div className="dosCommandInputRow">
              <Search size={19} aria-hidden />
              <Command.Input autoFocus placeholder="Cosa vuoi fare adesso?" />
              <span className="dosCommandShortcut">Esc</span>
            </div>
            <Command.List className="dosCommandList">
              <Command.Empty className="dosCommandEmpty">Nessun percorso trovato. Prova con un verbo: prepara, registra, cerca, organizza.</Command.Empty>
              {NAVIGATION_GROUPS.map((group) => (
                <Command.Group heading={group.label} key={group.key}>
                  {navigationGroupItems(group).map((item) => {
                    const Icon = ICONS[item.key]
                    return (
                      <Command.Item
                        key={item.key}
                        value={`${item.label} ${item.description} ${item.keywords.join(' ')}`}
                        onSelect={() => onNavigate(item.href)}
                        className="dosCommandItem"
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
              <span>DOCENTE OS apre il contesto; le modifiche restano nella superficie corretta.</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MobileMenu({
  open,
  onOpenChange,
  active,
  onNavigate,
  academicYearLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  active: NavigationKey
  onNavigate: (href: string) => void
  academicYearLabel?: string | null
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dosDialogOverlay" />
        <Dialog.Content className="dosMobileSheet">
          <div className="dosMobileSheetHeader">
            <div>
              <span>DOCENTE OS</span>
              <strong>{academicYearLabel ?? 'Anno da configurare'}</strong>
            </div>
            <Dialog.Close className="dosSheetClose" aria-label="Chiudi menu"><X size={20} aria-hidden /></Dialog.Close>
          </div>
          <Dialog.Title>Cosa vuoi fare?</Dialog.Title>
          <p className="dosMobileSheetLead">Scegli il tipo di lavoro; il sistema ti porta nella superficie pertinente.</p>
          <div className="dosMobileMenuGroups">
            {NAVIGATION_GROUPS.map((group) => (
              <section className="dosMobileMenuGroup" key={group.key}>
                <div className="dosMobileMenuGroupHeading">
                  <strong>{group.label}</strong>
                  <span>{group.description}</span>
                </div>
                <div className="dosMobileMenuGrid">
                  {navigationGroupItems(group).map((item) => {
                    const Icon = ICONS[item.key]
                    return (
                      <button key={item.key} type="button" className={cn('dosMobileMenuItem', item.key === active && 'active')} onClick={() => onNavigate(item.href)}>
                        <Icon size={21} aria-hidden />
                        <span><strong>{item.label}</strong><small>{item.description}</small></span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
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
