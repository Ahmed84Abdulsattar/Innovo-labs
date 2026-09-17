'use client'
import { useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import type { Startup, CostEntry, StartupCosts } from '@/lib/shared/types'

const CURRENT_YEAR = new Date().getFullYear()

function fmtAED(n: number) {
  return `AED ${n.toLocaleString()}`
}

function CostTable({ entries, label, color, canEdit, onAdd, onRemove }: {
  entries: CostEntry[]; label: string; color: string; canEdit: boolean
  onAdd: (e: CostEntry) => void; onRemove: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [desc, setDesc]     = useState('')
  const [amount, setAmount] = useState('')
  const [year, setYear]     = useState(String(CURRENT_YEAR))
  const [notes, setNotes]   = useState('')

  const total = entries.reduce((s, e) => s + e.amount, 0)

  const add = () => {
    if (!desc.trim() || !amount) return
    onAdd({ id: `ce${Date.now()}`, description: desc, amount: Number(amount), currency: 'AED', year: Number(year), notes: notes || undefined })
    setAdding(false); setDesc(''); setAmount(''); setYear(String(CURRENT_YEAR)); setNotes('')
  }

  return (
    <div className="inn-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h4>
          <span className="text-xs font-light ml-2" style={{ color: 'var(--text-muted)' }}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color }}>{fmtAED(total)}</span>
          {canEdit && <button type="button" onClick={() => setAdding(v => !v)} className="btn-primary text-xs"><Plus size={12} /> Add</button>}
        </div>
      </div>

      {adding && (
        <div className="px-5 py-4 border-b animate-slide-up" style={{ borderColor: 'var(--aqua-border)', background: 'var(--aqua-pale)', opacity: 0, animationFillMode: 'forwards' }}>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="col-span-2"><label className="block text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>Description *</label><input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Installation & setup" className="inn-input" /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>Amount (AED) *</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="inn-input" /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>Year</label><input type="number" value={year} onChange={e => setYear(e.target.value)} className="inn-input" /></div>
            <div className="col-span-4"><label className="block text-xs font-medium mb-1" style={{ color: 'var(--gray-500)' }}>Notes</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="inn-input" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="button" onClick={add} className="btn-aqua text-xs">Add entry</button>
          </div>
        </div>
      )}

      {entries.length === 0 && !adding ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-light" style={{ color: 'var(--faint)' }}>No {label.toLowerCase()} entries yet.</p>
        </div>
      ) : (
        <table className="inn-table">
          <thead><tr><th>Description</th><th>Year</th><th>Amount (AED)</th><th>Notes</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                <td style={{ color: 'var(--text-muted)' }}>{e.year}</td>
                <td className="font-semibold" style={{ color }}>{fmtAED(e.amount)}</td>
                <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.notes || '—'}</td>
                {canEdit && <td><button type="button" onClick={() => onRemove(e.id)} className="btn-ghost text-xs" style={{ color: '#ef4444' }}><Trash2 size={12} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function CostsTab({ startup, canEdit }: { startup: Startup; canEdit: boolean }) {
  const { updateStartup } = useApp()
  const costs = startup.costs || { capex: [], opex: [] }

  const save = (updated: Partial<StartupCosts>) => updateStartup(startup.id, { costs: { ...costs, ...updated } })

  const [roiDesc, setRoiDesc]     = useState(costs.roiDescription || '')
  const [roiMonths, setRoiMonths] = useState(String(costs.roiEstimatedMonths || ''))
  const [roiNotes, setRoiNotes]   = useState(costs.roiNotes || '')
  const [roiEditing, setRoiEditing] = useState(false)

  const totalCapex = costs.capex.reduce((s, e) => s + e.amount, 0)
  const totalOpex  = costs.opex.reduce((s, e) => s + e.amount, 0)
  const totalCost  = totalCapex + totalOpex

  const addCapex   = (e: CostEntry) => save({ capex: [...costs.capex, e] })
  const addOpex    = (e: CostEntry) => save({ opex:  [...costs.opex,  e] })
  const removeCapex= (id: string)  => save({ capex: costs.capex.filter(e => e.id !== id) })
  const removeOpex = (id: string)  => save({ opex:  costs.opex.filter(e => e.id !== id) })

  const saveROI = () => {
    save({ roiDescription: roiDesc, roiEstimatedMonths: roiMonths ? Number(roiMonths) : undefined, roiNotes: roiNotes || undefined })
    setRoiEditing(false)
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total CapEx', value: fmtAED(totalCapex), sub: 'Initial costs', color: 'var(--chip-violet)' },
          { label: 'Annual OpEx', value: fmtAED(totalOpex),  sub: 'Ongoing annual costs',  color: 'var(--chip-cyan)' },
          { label: 'Total Committed', value: fmtAED(totalCost), sub: 'Combined total',      color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-light mb-2" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-xl font-semibold" style={{ color: s.color, lineHeight: 1.2 }}>{s.value}</p>
            <p className="text-[11px] font-light mt-1" style={{ color: 'var(--faint)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <CostTable entries={costs.capex} label="CapEx — Initial Costs" color="var(--chip-violet)"
        canEdit={canEdit} onAdd={addCapex} onRemove={removeCapex} />

      <CostTable entries={costs.opex} label="OpEx — Ongoing Annual Costs" color="var(--chip-cyan)"
        canEdit={canEdit} onAdd={addOpex} onRemove={removeOpex} />

      {/* ROI */}
      <div className="inn-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gray-100)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Return on Investment</h4>
          </div>
          <div className="flex items-center gap-2">
            {costs.roiEstimatedMonths && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--su-green-bg)', color: 'var(--su-green-tx)' }}>
                Est. payback: {costs.roiEstimatedMonths} months
              </span>
            )}
            {canEdit && !roiEditing && <button type="button" onClick={() => setRoiEditing(true)} className="btn-secondary text-xs">Edit ROI</button>}
            {roiEditing && <><button type="button" onClick={() => setRoiEditing(false)} className="btn-secondary text-xs">Cancel</button><button type="button" onClick={saveROI} className="btn-aqua text-xs">Save</button></>}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>ROI description</label>
            <textarea rows={3} value={roiDesc} onChange={e => setRoiDesc(e.target.value)} disabled={!roiEditing}
              placeholder="Describe the expected return — cost savings, efficiency gains, headcount reduction, revenue impact…" className="inn-input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Estimated payback period (months)</label>
              <input type="number" value={roiMonths} onChange={e => setRoiMonths(e.target.value)} disabled={!roiEditing}
                placeholder="e.g. 18" className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Annual savings estimate (AED)</label>
              <input type="text" value={roiNotes} onChange={e => setRoiNotes(e.target.value)} disabled={!roiEditing}
                placeholder="e.g. AED 200,000 / year" className="inn-input" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
