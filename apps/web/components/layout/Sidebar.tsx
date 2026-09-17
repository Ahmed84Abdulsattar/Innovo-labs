'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Layers, Users, ClipboardList,
  Bell, ChevronDown, LogOut, Building2, HardHat, Wrench,
  Building, Lightbulb, X,
  FlaskConical, Handshake, Target, Newspaper, UserCircle, Sparkles,
} from 'lucide-react'
import InnovoLogo from '@/components/ui/InnovoLogo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useApp } from '@/lib/client/context'
import { isAdmin } from '@/lib/shared/permissions'
import { BUILD_DEPARTMENTS } from '@/lib/shared/constants'
import type { User } from '@/lib/shared/types'

interface Props { user: User; onUserChange: (id: string) => void; mobileOpen?: boolean; onMobileClose?: () => void }

// Theme-aware sidebar palette — all values resolve from CSS tokens that flip
// between the light (aqua rail) and dark (slate rail) themes with no flash.
const S = {
  text:        'var(--sidebar-text)',
  icon:        'var(--sidebar-icon)',
  activeText:  'var(--sidebar-active-text)',
  activeBg:    'var(--sidebar-active-bg)',
  hoverBg:     'var(--sidebar-hover-bg)',
  border:      'var(--sidebar-border)',
  muted:       'var(--sidebar-muted)',
  accent:      'var(--sidebar-accent)',
}

// ── NavLink ────────────────────────────────────────────────────────────────
function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const p  = usePathname()
  const sp = useSearchParams()
  const hasBU = !!sp.get('bu')
  const active =
    (p === href && !hasBU) ||
    (href !== '/dashboard' && p.startsWith(href + '/') && !hasBU)
  const [hov, setHov] = useState(false)

  return (
    <Link href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 8, fontSize: 13,
        fontWeight: active ? 600 : 400, color: active ? S.activeText : S.text,
        background: active ? S.activeBg : hov ? S.hoverBg : 'transparent',
        textDecoration: 'none', transition: 'background 0.15s',
      }}>
      <Icon size={16} strokeWidth={1.5} style={{ color: active ? S.activeText : S.icon, flexShrink: 0 }} />
      <span>{label}</span>
    </Link>
  )
}

// ── BU filter sub-link (under Startups) ────────────────────────────────
function BUFilterLink({ bu, icon: Icon }: { bu: string; icon: React.ElementType }) {
  const p  = usePathname()
  const sp = useSearchParams()
  const active = p === '/initiatives' && sp.get('bu') === bu
  const [hov, setHov] = useState(false)

  return (
    <Link href={`/initiatives?bu=${encodeURIComponent(bu)}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px 8px 34px', fontSize: 12, borderRadius: 8,
        fontWeight: active ? 600 : 400,
        color: active ? S.activeText : S.icon,
        background: active ? S.activeBg : hov ? S.hoverBg : 'transparent',
        textDecoration: 'none', transition: 'background 0.15s',
      }}>
      <Icon size={13} style={{ color: active ? S.activeText : S.icon, flexShrink: 0 }} />
      <span>{bu}</span>
    </Link>
  )
}

// ── Build dept sub-link ───────────────────────────────────────────────────
function BuildDeptFilterLink({ dept }: { dept: string }) {
  const p  = usePathname()
  const sp = useSearchParams()
  const active = p === '/initiatives' && sp.get('bu') === 'Build' && sp.get('dept') === dept
  const [hov, setHov] = useState(false)

  return (
    <Link
      href={`/initiatives?bu=Build&dept=${encodeURIComponent(dept)}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px 7px 50px', fontSize: 12, borderRadius: 8,
        fontWeight: active ? 600 : 400,
        color: active ? S.accent : S.icon,
        background: active ? S.activeBg : hov ? S.hoverBg : 'transparent',
        textDecoration: 'none', transition: 'background 0.15s',
      }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0, background: active ? S.accent : S.muted }} />
      {dept}
    </Link>
  )
}

// ── Notifications panel ───────────────────────────────────────────────────
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifications } = useApp()
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
      <div style={{
        position: 'fixed', left: 248, bottom: 80, zIndex: 50,
        width: 320, maxHeight: 420, overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'scaleIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <Bell size={22} style={{ color: 'var(--gray-300)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 300 }}>No notifications yet</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--surface-2)', display: 'flex', gap: 10, background: n.read ? 'var(--surface)' : 'var(--aqua-pale)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: n.read ? 'var(--gray-200)' : 'var(--aqua-dark)' }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 500, color: n.read ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1.45 }}>{n.message}</p>
              <p style={{ fontSize: 11, marginTop: 3, color: 'var(--text-muted)' }}>
                {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export default function Sidebar({ user, mobileOpen = false, onMobileClose }: Props) {
  const p  = usePathname()
  const sp = useSearchParams()
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [notifOpen,       setNotifOpen]       = useState(false)
  const [initiativesOpen, setInitiativesOpen] = useState(p === '/initiatives' || p.startsWith('/initiatives/'))
  const [buildOpen,       setBuildOpen]       = useState(sp.get('bu') === 'Build')
  const { markAllRead, unreadCount } = useApp()
  const divStyle = { borderColor: S.border }
  const [hovNotif, setHovNotif] = useState(false)
  const [hovUser,  setHovUser]  = useState(false)

  const initiativesActive = (p === '/initiatives' && !sp.get('bu')) || p.startsWith('/initiatives/')

  return (
    <>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40"
          style={{ background: 'var(--overlay)', backdropFilter: 'blur(2px)' }}
          onClick={onMobileClose} />
      )}
      <aside
        className={`fixed left-0 top-0 h-screen w-60 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        }}>

        {/* Close — mobile only */}
        <button className="md:hidden absolute top-3 right-3"
          onClick={onMobileClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, zIndex: 1 }}>
          <X size={18} style={{ color: S.activeText, opacity: 0.55 }} />
        </button>

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b" style={divStyle}>
          <InnovoLogo color="var(--sidebar-logo)" height={30} />
          <p style={{ marginTop: 5, fontSize: 11, fontWeight: 500, color: 'var(--sidebar-brand-sub)', letterSpacing: '0.01em' }}>
            Innovating for a better tomorrow
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} />

          {/* Startups — collapsible group */}
          <div>
            <Link
              href="/initiatives"
              onClick={() => setInitiativesOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, fontSize: 13,
                fontWeight: initiativesActive ? 600 : 400,
                color: initiativesActive ? S.activeText : S.text,
                background: initiativesActive ? S.activeBg : 'transparent',
                textDecoration: 'none', transition: 'background 0.15s',
              }}>
              <Target size={16} strokeWidth={1.5} style={{ color: initiativesActive ? S.activeText : S.icon, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Initiatives</span>
              <ChevronDown size={12} style={{ color: S.icon, opacity: 0.6, transform: initiativesOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
            </Link>

            {initiativesOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                {/* Build — collapsible */}
                <div>
                  <Link
                    href="/initiatives?bu=Build"
                    onClick={() => setBuildOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px 8px 34px', fontSize: 12, borderRadius: 8,
                      fontWeight: sp.get('bu') === 'Build' ? 600 : 400,
                      color: sp.get('bu') === 'Build' ? S.activeText : S.icon,
                      background: sp.get('bu') === 'Build' ? S.activeBg : 'transparent',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}>
                    <HardHat size={13} style={{ color: sp.get('bu') === 'Build' ? S.activeText : S.icon, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>Build</span>
                    <ChevronDown size={11} style={{ color: S.icon, opacity: 0.5, transform: buildOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                  </Link>
                  {buildOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                      {BUILD_DEPARTMENTS.map(dept => (
                        <BuildDeptFilterLink key={dept} dept={dept} />
                      ))}
                    </div>
                  )}
                </div>
                <BUFilterLink bu="MEP"         icon={Wrench}  />
                <BUFilterLink bu="Development" icon={Building} />
              </div>
            )}
          </div>

          <NavLink href="/news"           label="News"           icon={Newspaper}   />
          <NavLink href="/ideas"          label="Ideas"          icon={Lightbulb}   />
          <NavLink href="/challenges"     label="Challenges"     icon={FlaskConical} />
          <NavLink href="/collaborations" label="Collaborations" icon={Handshake}   />
          <NavLink href="/startups"            label="Startups"              icon={Layers}    />
          <NavLink href="/innovation-concierge"  label="Innovation Concierge"  icon={Sparkles}  />

          {isAdmin(user) && (
            <>
              <div style={{ paddingTop: 18, paddingBottom: 5, paddingLeft: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.muted }}>Admin</p>
              </div>
              <NavLink href="/admin/users" label="Users"     icon={Users}        />
              <NavLink href="/admin/audit" label="Audit log" icon={ClipboardList} />
            </>
          )}

          {!isAdmin(user) && (
            <div style={{ marginTop: 16, marginLeft: 4, marginRight: 4, padding: '10px 12px', borderRadius: 8, background: 'var(--sidebar-chip-bg)', border: '1px solid var(--sidebar-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={11} style={{ color: S.activeText, opacity: 0.55 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: S.activeText }}>{user.department}</span>
              </div>
              <p style={{ fontSize: 11, marginTop: 2, color: S.muted, fontWeight: 300 }}>
                {user.role === 'contributor' ? 'Contributor' : 'Viewer'} access
              </p>
            </div>
          )}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 pt-2 pb-2 border-t" style={divStyle}>
          <ThemeToggle />
        </div>

        {/* Notifications */}
        <div className="px-3 pb-2 border-t" style={{ ...divStyle, paddingTop: 10 }}>
          <button
            onClick={() => { setNotifOpen(v => !v); markAllRead() }}
            onMouseEnter={() => setHovNotif(true)}
            onMouseLeave={() => setHovNotif(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 400,
              color: S.text,
              background: notifOpen ? S.activeBg : hovNotif ? S.hoverBg : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
            }}>
            <Bell size={16} strokeWidth={1.5} style={{ color: S.icon, flexShrink: 0 }} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: 'var(--sidebar-badge-bg)', color: 'var(--sidebar-badge-text)' }}>
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User */}
        <div className="px-3 pb-4 border-t" style={{ ...divStyle, paddingTop: 10 }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            onMouseEnter={() => setHovUser(true)}
            onMouseLeave={() => setHovUser(false)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              background: menuOpen ? S.activeBg : hovUser ? S.hoverBg : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
            }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: 'var(--sidebar-avatar-bg)', color: S.activeText,
              border: '1.5px solid var(--sidebar-avatar-border)',
              overflow: 'hidden',
            }}>
              {user.profilePhoto
                ? <img src={user.profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: S.activeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </p>
              <p style={{ fontSize: 11, fontWeight: 300, color: S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'innovation_admin' ? `Admin · ${user.department}` : `${user.role} · ${user.department}`}
              </p>
            </div>
            <ChevronDown size={12} style={{ color: S.muted, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
          </button>

          {menuOpen && (
            <div style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden', background: 'var(--sidebar-chip-bg)', border: '1px solid var(--sidebar-border)' }}>
              <Link href="/profile"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, fontWeight: 500, color: 'var(--sidebar-brand-sub)', textDecoration: 'none', borderBottom: '1px solid var(--sidebar-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => setMenuOpen(false)}>
                <UserCircle size={13} /> My Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
                  window.location.href = '/login'
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, fontWeight: 500, color: 'var(--sidebar-brand-sub)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-brand-sub)' }}>
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
