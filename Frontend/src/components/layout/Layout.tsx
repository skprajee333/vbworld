import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  BarChart3,
  SmartphoneCharging,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Receipt,
  ChefHat,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Truck,
  UserCheck,
  Users,
  Warehouse,
  Activity,
  Siren,
  KeyRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useTheme } from '../../store/theme'
import Toaster from '../feedback/Toaster'

const NAV_RESTAURANT = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: Package, label: 'Place Order' },
  { to: '/pos', icon: Receipt, label: 'POS Billing' },
  { to: '/smart', icon: Sparkles, label: 'Smart Order', badge: 'AI' },
  { to: '/history', icon: History, label: 'Order History' },
  { to: '/customers', icon: Star, label: 'Customers' },
  { to: '/aggregators', icon: SmartphoneCharging, label: 'Aggregator Hub' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const NAV_WAREHOUSE = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ClipboardList, label: 'Manage Orders' },
  { to: '/stock', icon: Warehouse, label: 'Stock Manager' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/route-planner', icon: Truck, label: 'Route Planner' },
  { to: '/purchase-orders', icon: FileText, label: 'Purchase Orders' },
  { to: '/grn', icon: ClipboardCheck, label: 'GRN' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

const NAV_WAREHOUSE_ADMIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ClipboardList, label: 'Manage Orders' },
  { to: '/stock', icon: Warehouse, label: 'Stock Manager' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/route-planner', icon: Truck, label: 'Route Planner' },
  { to: '/purchase-orders', icon: FileText, label: 'Purchase Orders' },
  { to: '/grn', icon: ClipboardCheck, label: 'GRN' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/customers', icon: Star, label: 'Customers' },
  { to: '/aggregators', icon: SmartphoneCharging, label: 'Aggregator Hub' },
  { to: '/audit', icon: FileSearch, label: 'Audit Trail' },
  { to: '/monitor', icon: Activity, label: 'System Monitor' },
  { to: '/exceptions', icon: Siren, label: 'Exceptions' },
  { to: '/permissions', icon: KeyRound, label: 'Permissions' },
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/impersonate', icon: UserCheck, label: 'Impersonate' },
  { to: '/recipes', icon: ChefHat, label: 'Recipes' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
]

const NAV_ADMIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/route-planner', icon: Truck, label: 'Route Planner' },
  { to: '/purchase-orders', icon: FileText, label: 'Purchase Orders' },
  { to: '/grn', icon: ClipboardCheck, label: 'GRN' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/customers', icon: Star, label: 'Customers' },
  { to: '/aggregators', icon: SmartphoneCharging, label: 'Aggregator Hub' },
  { to: '/audit', icon: FileSearch, label: 'Audit Trail' },
  { to: '/monitor', icon: Activity, label: 'System Monitor' },
  { to: '/exceptions', icon: Siren, label: 'Exceptions' },
  { to: '/permissions', icon: KeyRound, label: 'Permissions' },
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/impersonate', icon: UserCheck, label: 'Impersonate' },
  { to: '/recipes', icon: ChefHat, label: 'Recipes' },
  { to: '/feedback', icon: MessageSquare, label: 'Feedback & Queries' },
]

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#a78bfa',
  WAREHOUSE_ADMIN: '#f97316',
  WAREHOUSE_MANAGER: '#06b6d4',
  RESTAURANT_STAFF: '#22c55e',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  WAREHOUSE_ADMIN: 'Warehouse Admin',
  WAREHOUSE_MANAGER: 'Warehouse',
  RESTAURANT_STAFF: 'Restaurant',
}

export default function Layout() {
  const { user, effectiveUser, impersonating, stopImpersonate, clear } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)
  const [open, setOpen] = useState(() => window.innerWidth >= 960)

  const eff = effectiveUser()
  const role = eff?.role || ''
  const initials = eff?.name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const roleColor = ROLE_COLORS[role] || '#6366f1'

  const nav = role === 'RESTAURANT_STAFF'
    ? NAV_RESTAURANT
    : role === 'WAREHOUSE_ADMIN'
      ? NAV_WAREHOUSE_ADMIN
      : role === 'WAREHOUSE_MANAGER'
        ? NAV_WAREHOUSE
        : NAV_ADMIN

  function logout() {
    clear()
    navigate('/login')
  }

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 960
      setIsMobile(mobile)
      setOpen(current => mobile ? false : current)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!isMobile || !open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobile, open])

  const asideWidth = open ? 240 : 62
  const topOffset = impersonating ? 40 : 0

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)', fontFamily:'Inter,sans-serif' }}>
      <a href="#app-main-content" style={{ position:'fixed', left:12, top:12, zIndex:1400, padding:'8px 12px', borderRadius:10, background:'#111827', color:'#fff', textDecoration:'none', transform:'translateY(-160%)', transition:'transform .15s' }} className="skip-link">Skip to content</a>

      {impersonating && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'linear-gradient(90deg,#f59e0b,#f97316)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13, color:'#fff', fontWeight:600 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <AlertTriangle size={16} />
            <span>
              Impersonating: <strong>{impersonating.name}</strong> ({impersonating.role.replace(/_/g, ' ')})
              {impersonating.branchName ? ` - ${impersonating.branchName}` : ''}
            </span>
          </div>
          <button aria-label="Exit impersonation view" onClick={() => { stopImpersonate(); navigate('/dashboard') }} style={{ background:'rgba(0,0,0,.2)', border:'none', color:'#fff', padding:'4px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:700 }}>
            Exit View
          </button>
        </div>
      )}

      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position:'fixed', inset:0, top:topOffset, background:'rgba(15,23,42,.45)', zIndex:60 }}
          aria-hidden="true"
        />
      )}

      <aside aria-label="Primary navigation" style={{
        width: asideWidth,
        flexShrink:0,
        display:'flex',
        flexDirection:'column',
        background:'var(--surface)',
        borderRight:'1px solid var(--border)',
        transition:'width .2s, transform .2s',
        marginTop: topOffset,
        ...(isMobile ? {
          position:'fixed',
          left:0,
          top:0,
          bottom:0,
          zIndex:70,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          width:240,
        } : {}),
      }}>
        <div style={{ padding:'14px 12px', display:'flex', alignItems:'center', justifyContent: open ? 'space-between' : 'center', borderBottom:'1px solid var(--border)' }}>
          {open && (
            <div>
              <div style={{ fontWeight:900, fontSize:17, lineHeight:1 }}>
                <span style={{ color:'#6366f1' }}>VB</span>
                <span style={{ color:'var(--text)' }}> World</span>
              </div>
              <div style={{ fontSize:10, fontWeight:700, marginTop:3, padding:'2px 7px', borderRadius:10, display:'inline-flex', alignItems:'center', gap:4, background:`${roleColor}18`, color:roleColor }}>
                {role === 'WAREHOUSE_ADMIN' && <ShieldCheck size={9} />}
                {ROLE_LABELS[role] || role}
              </div>
            </div>
          )}
          <button aria-label={open ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={open} onClick={() => setOpen(!open)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4, display:'flex', flexShrink:0 }}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav aria-label="Sidebar links" style={{ flex:1, padding:'8px 6px', overflowY:'auto' }}>
          {(nav as any[]).map(({ to, icon: Icon, label, badge }: any) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={!open ? label : undefined}
              onClick={() => { if (isMobile) setOpen(false) }}
              style={({ isActive }) => ({ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, marginBottom:2, textDecoration:'none', fontSize:13, fontWeight:500, background:isActive ? '#6366f1' : 'transparent', color:isActive ? '#fff' : '#94a3b8', transition:'background .15s', position:'relative' })}
            >
              <Icon size={17} style={{ flexShrink:0 }} />
              {open && <span style={{ flex:1 }}>{label}</span>}
              {open && badge && <span style={{ fontSize:9, fontWeight:800, padding:'1px 5px', borderRadius:8, background:'linear-gradient(135deg,#6366f1,#a78bfa)', color:'#fff' }}>{badge}</span>}
              {!open && <span style={{ position:'absolute', left:52, background:'var(--card)', border:'1px solid var(--border)', padding:'4px 10px', borderRadius:8, fontSize:12, whiteSpace:'nowrap', color:'var(--text)', pointerEvents:'none', opacity:0, transition:'opacity .15s', zIndex:100, boxShadow:'0 4px 12px rgba(0,0,0,.3)' }} className="sidebar-tooltip">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'6px 6px 10px', borderTop:'1px solid var(--border)' }}>
          <button aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, width:'100%', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:13 }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {open && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {open && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, background:'var(--card)', border:'1px solid var(--border)', margin:'4px 0' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12, background:`linear-gradient(135deg,${roleColor},#a78bfa)` }}>
                {initials}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{impersonating ? impersonating.name : user?.name}</div>
                <div style={{ fontSize:10, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{eff?.branchName || ROLE_LABELS[role]}</div>
              </div>
            </div>
          )}

          <button aria-label="Logout" onClick={logout} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, width:'100%', background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:13 }}>
            <LogOut size={16} />{open && 'Logout'}
          </button>
        </div>
      </aside>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', marginTop: topOffset }}>
        <header style={{ height:isMobile ? 56 : 50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:isMobile ? '0 12px' : '0 20px', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0, gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            {isMobile && (
              <button
                aria-label="Open navigation"
                onClick={() => setOpen(true)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text)', padding:4, display:'flex' }}
              >
                <Menu size={18} />
              </button>
            )}
            <span style={{ fontSize:isMobile ? 11 : 12, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {!isMobile && eff?.branchName && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:10, background:`${roleColor}18`, color:roleColor, fontWeight:700 }}>{eff.branchName}</span>}
            <div aria-hidden="true" style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12, background:`linear-gradient(135deg,${roleColor},#a78bfa)` }}>{initials}</div>
          </div>
        </header>

        <main id="app-main-content" tabIndex={-1} style={{ flex:1, overflowY:'auto', padding:isMobile ? 12 : 20, paddingTop:isMobile ? 12 : 16 }}>
          <Outlet />
        </main>
      </div>

      <style>{`nav a:hover .sidebar-tooltip, nav a:focus-visible .sidebar-tooltip { opacity: 1 !important; } .skip-link:focus-visible { transform: translateY(0) !important; } button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }`}</style>
      <Toaster />
    </div>
  )
}
