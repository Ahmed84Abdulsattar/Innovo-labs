'use client'
import { useState, useMemo, useEffect } from 'react'
import { Search, AlertCircle, Shield, Users, Eye, Check, Star, Trophy } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import { useIdeas } from '@/lib/client/hooks/useIdeas'
import { isAdmin, isSuperAdmin, canManageUser } from '@/lib/shared/permissions'
import { DEPARTMENTS } from '@/lib/shared/constants'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import Pagination from '@/components/ui/Pagination'
import type { Role, User } from '@/lib/shared/types'

const ROLE_STYLE: Record<Role,string> = {
  super_admin:      'bg-[#122023] text-[#9ef3ee] border border-[#1a2e33]',
  innovation_admin: 'bg-[var(--aqua-light)] text-[var(--accent)] border border-[var(--aqua-border)]',
  contributor:      'bg-[var(--gray-100)] text-[var(--text-secondary)] border border-[var(--gray-200)]',
  viewer:           'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]',
}
const ROLE_ICON: Record<Role,React.ElementType> = {super_admin:Star,innovation_admin:Shield,contributor:Users,viewer:Eye}

function SortTh({ label, k, sortKey, sortDir, onSort }: { label: string; k: string; sortKey: string; sortDir: 'asc'|'desc'; onSort: (key: string) => void }) {
  const active = sortKey === k
  return (
    <th onClick={() => onSort(k)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label}<span style={{ marginLeft: 4, fontSize: 10, color: active ? 'var(--accent)' : 'var(--gray-300)' }}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
  )
}

export default function AdminUsersPage() {
  const { users, updateUser, currentUser } = useApp()
  const { data: ideas = [] } = useIdeas()

  const creditsByUser = useMemo(() => {
    const map: Record<string, { submitted: number; approved: number; total: number }> = {}
    ideas.forEach(idea => {
      const uid = idea.submittedBy
      if (!map[uid]) map[uid] = { submitted: 0, approved: 0, total: 0 }
      map[uid].submitted += 1
      const isApproved = idea.status === 'Accepted' || idea.status === 'Converted to Initiative'
      if (isApproved) map[uid].approved += 1
      map[uid].total += isApproved ? 11 : 1
    })
    return map
  }, [ideas])

  const [search,setSearch]     = useState('')
  const [filterRole,setRole]   = useState('')
  const [filterDept,setDept]   = useState('')
  const [editId,setEditId]     = useState<string|null>(null)
  const [editRole,setEditRole] = useState<Role>('viewer')
  const [editDept,setEditDept] = useState('')
  const [page,setPage]         = useState(1)
  const [sortKey,setSortKey]   = useState<string>('')
  const [sortDir,setSortDir]   = useState<'asc'|'desc'>('asc')
  // Tri-state per column: 1st click asc, 2nd desc, 3rd clears back to the original order.
  const toggleSort = (k: string) => {
    if (sortKey !== k)          { setSortKey(k); setSortDir('asc') } // new column → ascending
    else if (sortDir === 'asc') { setSortDir('desc') }              // ascending → descending
    else                        { setSortKey(''); setSortDir('asc') } // descending → no sort
  }

  const filtered = users.filter(u => {
    const q=search.toLowerCase()
    return(!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q))
      &&(!filterRole||u.role===filterRole)&&(!filterDept||u.department===filterDept)
  })
  const unassigned = users.filter(u=>u.departmentUnassigned)

  // Single-column sort: clicking a header sorts by it; the previous sort is replaced.
  const roleRank: Record<string, number> = { super_admin: 4, innovation_admin: 3, contributor: 2, viewer: 1 }
  const sortVal = (u: User): string | number => {
    switch (sortKey) {
      case 'user':    return (u.name || '').toLowerCase()
      case 'dept':    return (u.department || '').toLowerCase()
      case 'role':    return roleRank[u.role] ?? 0
      case 'credits': return creditsByUser[u.id]?.total ?? 0
      case 'login':   return u.lastLogin ? new Date(u.lastLogin).getTime() : 0
      default:        return ''
    }
  }
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = sortVal(a), vb = sortVal(b)
        const c = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? c : -c
      })
    : filtered

  const PER_PAGE   = 20
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const safeP      = Math.min(page, totalPages)
  const paged      = sorted.slice((safeP - 1) * PER_PAGE, safeP * PER_PAGE)
  useEffect(() => { setPage(1) }, [search, filterRole, filterDept, sortKey, sortDir])

  // Guard AFTER all hooks: an early return before them would call hooks
  // conditionally and violate React's Rules of Hooks (can crash on re-render).
  if (!isAdmin(currentUser)) return <div className="p-8 text-center"><p className="text-sm font-light" style={{color:'var(--faint)'}}>Access restricted.</p></div>

  const startEdit = (u: User) => { if (!canManageUser(currentUser, u)) return; setEditId(u.id); setEditRole(u.role); setEditDept(u.department) }
  const saveEdit  = (id:string) => {
    const targetUser = users.find(u => u.id === id)
    // Regular admins cannot change department
    const dept = currentUser.role === 'super_admin' ? editDept : (targetUser?.department || editDept)
    updateUser(id,{role:editRole, department:dept as User['department'], departmentUnassigned:false})
    setEditId(null)
  }

  return (
    <div className="p-4 md:p-8 page-enter">
      <PageHeader
        title="User Management"
        eyebrow="Admin"
        subtitle={`${users.length} users${unassigned.length>0?` · ${unassigned.length} unassigned`:''}`}
      />

      {unassigned.length>0&&(
        <div className="flex items-start gap-3 p-4 rounded-xl mb-6" style={{background:'var(--su-red-bg)',border:'1px solid var(--su-red-border)'}}>
          <AlertCircle size={16} style={{color:'#ef4444',flexShrink:0,marginTop:1}}/>
          <div>
            <p className="text-sm font-medium" style={{color:'#ef4444'}}>{unassigned.length} user{unassigned.length>1?'s':''} with unassigned department</p>
            <p className="text-xs font-light mt-0.5" style={{color:'#f87171'}}>{unassigned.map(u=>u.name).join(', ')} — click Edit to assign.</p>
          </div>
        </div>
      )}

      {/* Innovation Credits Leaderboard */}
      {isSuperAdmin(currentUser) && (() => {
        const ranked = [...users]
          .map(u => ({ ...u, credits: creditsByUser[u.id]?.total ?? 0 }))
          .sort((a, b) => b.credits - a.credits)
          .slice(0, 5)
        const rankColors = ['#F59E0B', '#94A3B8', '#B45309', 'var(--faint)', 'var(--faint)']
        return (
          <div className="inn-card overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
              <Trophy size={14} style={{ color: 'var(--accent)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Innovation Credits Leaderboard</h2>
              <span className="text-xs ml-auto" style={{ color: 'var(--faint)' }}>Top 5 contributors</span>
            </div>
            <div>
              {ranked.map((u, idx) => {
                const c = creditsByUser[u.id] ?? { submitted: 0, approved: 0, total: 0 }
                const pct = ranked[0].credits > 0 ? (c.total / ranked[0].credits) * 100 : 0
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3 border-b last:border-0" style={{ borderColor: 'var(--gray-100)' }}>
                    <span style={{ width: 20, fontSize: 12, textAlign: 'center', flexShrink: 0, fontWeight: 800, color: rankColors[idx], fontVariantNumeric: 'tabular-nums' }}>
                      #{idx + 1}
                    </span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--aqua-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                      {u.profilePhoto
                        ? <img src={u.profilePhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{c.total} pts</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--gray-100)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: idx === 0 ? 'var(--accent)' : 'var(--aqua-border)', borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--faint)', marginTop: 3 }}>{c.submitted} submitted · {c.approved} approved</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {label:'Super Admins', value:users.filter(u=>u.role==='super_admin').length, color:'var(--su-amber-tx)'},
          {label:'Admins',       value:users.filter(u=>u.role==='innovation_admin').length, color:'var(--accent)'},
          {label:'Contributors', value:users.filter(u=>u.role==='contributor').length, color:'var(--chip-violet)'},
          {label:'Viewers',      value:users.filter(u=>u.role==='viewer').length,      color:'var(--text-muted)'},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <p className="text-2xl font-semibold" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs font-light mt-1" style={{color:'var(--text-muted)'}}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--faint)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search users…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="inn-input"
            style={{ paddingLeft: 38, paddingRight: 12 }} />
        </div>
        <select value={filterRole} onChange={e => setRole(e.target.value)}
          className="inn-select"
          style={{ width: 120, fontSize: 12, padding: '8px 28px 8px 10px' }}>
          <option value="">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="innovation_admin">Innovation Admin</option>
          <option value="contributor">Contributor</option>
          <option value="viewer">Viewer</option>
        </select>
        <select value={filterDept} onChange={e => setDept(e.target.value)}
          className="inn-select"
          style={{ width: 148, fontSize: 12, padding: '8px 28px 8px 10px' }}>
          <option value="">All business units</option>
          {DEPARTMENTS.filter(d => d !== 'Steel Fabrication' && d !== 'Concrete Manufacturing').map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="inn-card overflow-x-auto">
        <table className="inn-table">
          <thead><tr>
            <SortTh label="User"               k="user"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="Business Unit"      k="dept"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="Role"               k="role"    sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="Innovation Credits" k="credits" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <SortTh label="Last login"         k="login"   sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {paged.map((user, idx)=>{
              const RoleIcon=ROLE_ICON[user.role]
              const isEditing=editId===user.id
              return (
                <tr key={user.id} className="animate-slide-up" style={{background:user.departmentUnassigned?'var(--su-red-bg)':'transparent', opacity: 0, animationFillMode: 'forwards', animationDelay: `${Math.min(idx * 40, 280)}ms`}}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                        style={{background:'var(--aqua-light)',color:'var(--accent)',border:'1px solid var(--aqua-border)',overflow:'hidden'}}>
                        {user.profilePhoto
                          ? <img src={user.profilePhoto} alt="avatar" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : user.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{color:'var(--text-primary)'}}>{user.name}</span>
                          {user.departmentUnassigned&&<AlertCircle size={12} style={{color:'#ef4444'}}/>}
                        </div>
                        <p className="text-[11px] font-light" style={{color:'var(--faint)'}}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isEditing
                      ? currentUser.role === 'super_admin'
                        ? <select value={editDept} onChange={e=>setEditDept(e.target.value)} className="inn-select text-xs w-40">
                            {DEPARTMENTS.filter(d => d !== 'Steel Fabrication' && d !== 'Concrete Manufacturing').map(d => <option key={d}>{d}</option>)}
                          </select>
                        : <span className="text-xs font-medium px-2 py-1 rounded-md" style={{background:'var(--aqua-pale)',color:'var(--accent)',border:'1px solid var(--aqua-border)'}}>{user.department}</span>
                      : user.departmentUnassigned
                        ? <span className="text-xs font-medium" style={{color:'#ef4444'}}>Unassigned</span>
                        : <Badge label={user.department} variant="dept" className="text-[10px]"/>}
                  </td>
                  <td>
                    {isEditing
                      ? <select value={editRole} onChange={e=>setEditRole(e.target.value as Role)} className="inn-select text-xs w-32">
                          {currentUser.role==='super_admin'&&<option value="super_admin">Super Admin</option>}
                          <option value="innovation_admin">Innovation Admin</option>
                          <option value="contributor">Contributor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      : <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${ROLE_STYLE[user.role]}`}>
                          <RoleIcon size={11}/>{({super_admin:'Super Admin',innovation_admin:'Innovation Admin',contributor:'Contributor',viewer:'Viewer'})[user.role]}
                        </span>}
                  </td>
                  <td>
                    {(() => {
                      const c = creditsByUser[user.id] ?? { submitted: 0, approved: 0, total: 0 }
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: c.total > 0 ? 'var(--accent)' : 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>{c.total}</span>
                          {c.total > 0 && (
                            <div>
                              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap' }}>
                                <span style={{ color: 'var(--chip-cyan)' }}>{c.submitted} sub</span>
                                {' · '}
                                <span style={{ color: 'var(--chip-green)' }}>{c.approved} appr</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="text-xs font-light" style={{color:'var(--text-muted)'}}>
                    {user.lastLogin?new Date(user.lastLogin).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Never'}
                  </td>
                  <td>
                    {isEditing
                      ? <div className="flex gap-2">
                          <button onClick={()=>saveEdit(user.id)} className="btn-aqua text-xs py-1 px-2"><Check size={12}/>Save</button>
                          <button onClick={()=>setEditId(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                        </div>
                      : <button onClick={()=>startEdit(user)} className="btn-secondary text-xs py-1 px-2">Edit</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={safeP} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
