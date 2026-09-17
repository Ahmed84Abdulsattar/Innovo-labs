'use client'
import { useState } from 'react'
import { Shield, Upload, FileText, Trash2, Download, Plus, Eye, X, File } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import type { Startup, AttachedDocument } from '@/lib/shared/types'

type CyberStatus = 'Pending' | 'Ongoing' | 'Completed'

const STATUS_STYLE: Record<CyberStatus, { bg: string; text: string; border: string }> = {
  Pending:   { bg: 'var(--su-amber-bg)', text: 'var(--su-amber-tx)', border: 'var(--su-amber-border)' },
  Ongoing:   { bg: 'var(--su-blue-bg)', text: 'var(--su-blue-tx)', border: 'var(--su-blue-border)' },
  Completed: { bg: 'var(--su-green-bg)', text: 'var(--su-green-tx)', border: 'var(--su-green-border)' },
}

function fmtSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType?: string, name?: string) {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (mimeType?.includes('pdf') || ext === 'pdf')       return { label: 'PDF',  color: 'var(--chip-rose)', bg: 'var(--su-red-bg)' }
  if (mimeType?.includes('word') || ext === 'docx' || ext === 'doc') return { label: 'DOC',  color: 'var(--chip-blue)', bg: 'var(--su-blue-bg2)' }
  if (mimeType?.includes('sheet') || ext === 'xlsx' || ext === 'xls') return { label: 'XLS', color: 'var(--chip-green)', bg: 'var(--su-green-bg2)' }
  return { label: 'FILE', color: 'var(--accent)', bg: 'var(--aqua-light)' }
}

function PreviewModal({ doc, onClose }: { doc: AttachedDocument; onClose: () => void }) {
  const isPDF   = doc.mimeType?.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf')
  const isImage = doc.mimeType?.startsWith('image/')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--text-primary)', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <FileText size={16} style={{ color: '#9ef3ee' }} />
          <p style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{doc.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {doc.dataUrl && <a href={doc.dataUrl} download={doc.name} className="btn-aqua text-xs" onClick={e => e.stopPropagation()} style={{ textDecoration: 'none' }}><Download size={13} /> Download</a>}
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><X size={14} /> Close</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.stopPropagation()}>
        {isPDF && doc.dataUrl ? (
          <iframe src={doc.dataUrl} title={doc.name} style={{ width: '100%', maxWidth: 1000, height: '100%', minHeight: '70vh', border: 'none', borderRadius: 8 }} />
        ) : isImage && doc.dataUrl ? (
          <img src={doc.dataUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <File size={64} style={{ color: 'rgba(158,243,238,0.4)', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{doc.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>This file type cannot be previewed in the browser.</p>
            {doc.dataUrl && <a href={doc.dataUrl} download={doc.name} className="btn-aqua" style={{ textDecoration: 'none' }}><Download size={14} /> Download to view</a>}
          </div>
        )}
      </div>
    </div>
  )
}

function DocRow({ doc, canDelete, onDelete, onPreview }: { doc: AttachedDocument; canDelete: boolean; onDelete: () => void; onPreview: () => void }) {
  const { label, color, bg } = getFileIcon(doc.mimeType, doc.name)
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)', transition: 'border-color 0.2s, background 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--aqua-border)'; e.currentTarget.style.background = 'var(--aqua-pale)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff'; }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color, letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
        <p className="text-xs font-light mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {doc.uploadedByName} · {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {doc.fileSize && ` · ${doc.fileSize}`}
        </p>
        {doc.note && <p className="text-xs font-light mt-1 italic" style={{ color: 'var(--gray-500)' }}>{doc.note}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {doc.dataUrl && <button type="button" onClick={onPreview} className="btn-secondary text-xs"><Eye size={12} /> Preview</button>}
        {doc.dataUrl && <a href={doc.dataUrl} download={doc.name} className="btn-aqua text-xs" style={{ textDecoration: 'none' }}><Download size={12} /> Download</a>}
        {canDelete && <button type="button" onClick={onDelete} className="btn-ghost text-xs" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>}
      </div>
    </div>
  )
}

function FileSection({
  title, description, fieldKey, startup, canEdit,
}: {
  title: string; description: string
  fieldKey: 'cyberSecurityReviewFile' | 'saasFile'
  startup: Startup; canEdit: boolean
}) {
  const { updateStartup, currentUser } = useApp()
  const [showAdd, setShowAdd]     = useState(false)
  const [docName, setDocName]     = useState('')
  const [docNote, setDocNote]     = useState('')
  const [fileName, setFileName]   = useState('')
  const [fileDataUrl, setFileDataUrl] = useState('')
  const [fileMime, setFileMime]   = useState('')
  const [fileSize, setFileSize]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [previewing, setPreviewing] = useState<AttachedDocument | null>(null)

  const doc = startup[fieldKey] as AttachedDocument | undefined

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFileMime(file.type)
    setFileSize(fmtSize(file.size))
    if (!docName) setDocName(file.name)
    setLoading(true)
    const reader = new FileReader()
    reader.onload = ev => { setFileDataUrl(ev.target?.result as string || ''); setLoading(false) }
    reader.readAsDataURL(file)
  }

  const addDoc = () => {
    if (!docName.trim() && !fileName) return
    const newDoc: AttachedDocument = {
      id: `csf_${Date.now()}`,
      name: docName.trim() || fileName,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name,
      uploadedAt: new Date().toISOString(),
      fileSize: fileSize || undefined,
      note: docNote.trim() || undefined,
      dataUrl: fileDataUrl || undefined,
      mimeType: fileMime || undefined,
    }
    updateStartup(startup.id, { [fieldKey]: newDoc })
    setShowAdd(false); setDocName(''); setDocNote(''); setFileName(''); setFileDataUrl(''); setFileMime(''); setFileSize('')
  }

  const removeDoc = () => updateStartup(startup.id, { [fieldKey]: null as any })

  return (
    <div>
      {previewing && <PreviewModal doc={previewing} onClose={() => setPreviewing(null)} />}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={15} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <p className="text-xs font-light mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
          </div>
        </div>
        {canEdit && !showAdd && (
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary text-xs">
            <Plus size={13} /> Add document
          </button>
        )}
      </div>

      {/* Upload form */}
      {showAdd && (
        <div className="inn-card p-5 mb-4 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', borderColor: 'var(--aqua-border)' }}>
          <p className="text-xs font-medium tracking-widest mb-4" style={{ color: 'var(--accent)' }}>ADD DOCUMENT</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Document name</label>
              <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder={`e.g. ${title} — April 2026`} className="inn-input" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Attach file</label>
              <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-[var(--aqua-pale)] transition-colors" style={{ border: '2px dashed var(--aqua-border)', background: 'var(--surface-2)' }}>
                <Upload size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  {fileName ? (
                    <><p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p><p className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>{fileSize} {loading && '· Reading…'}</p></>
                  ) : (
                    <><p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Click to select file</p><p className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, XLSX accepted</p></>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg" onChange={handleFileChange} />
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Note (optional)</label>
              <input type="text" value={docNote} onChange={e => setDocNote(e.target.value)} placeholder="e.g. Final version — reviewed by IT" className="inn-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="button" onClick={addDoc} disabled={loading} className="btn-aqua text-xs" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Reading…' : 'Add document'}
            </button>
          </div>
        </div>
      )}

      {/* Document or empty state */}
      {doc ? (
        <div className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <DocRow doc={doc} canDelete={canEdit} onDelete={removeDoc} onPreview={() => setPreviewing(doc)} />
        </div>
      ) : !showAdd ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={22} style={{ color: 'var(--faint)' }} />
          </div>
          <h3>No document uploaded yet</h3>
          {canEdit
            ? <p>Click "Add document" to upload the first file.</p>
            : <p>No file has been attached to this section.</p>}
        </div>
      ) : null}
    </div>
  )
}

export default function CyberSecurityTab({ startup, canEdit }: { startup: Startup; canEdit: boolean }) {
  const { updateStartup } = useApp()
  const status = startup.cyberSecurityStatus as CyberStatus | undefined

  return (
    <div className="space-y-6">
      {/* Status dropdown */}
      <div className="inn-card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold tracking-widest mb-0.5" style={{ color: 'var(--accent)' }}>CYBER SECURITY STATUS</p>
            <p className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>Current review progress</p>
          </div>
          <div className="flex items-center gap-3">
            {canEdit ? (
              <select
                value={status || ''}
                onChange={e => updateStartup(startup.id, { cyberSecurityStatus: e.target.value as CyberStatus || undefined })}
                className="inn-select"
                style={{ minWidth: 160 }}>
                <option value="">— Select status —</option>
                <option value="Pending">Pending</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
            ) : null}
            {status && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{
                background: STATUS_STYLE[status].bg,
                color:      STATUS_STYLE[status].text,
                border:     `1px solid ${STATUS_STYLE[status].border}`,
              }}>
                {status}
              </span>
            )}
            {!status && !canEdit && (
              <span className="text-sm font-light" style={{ color: 'var(--faint)' }}>No status set</span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--gray-100)' }} />

      {/* Cyber Security Review file */}
      <FileSection
        title="Cyber Security Review"
        description="Upload the vendor cyber security review document"
        fieldKey="cyberSecurityReviewFile"
        startup={startup}
        canEdit={canEdit}
      />

      <div style={{ borderTop: '1px solid var(--gray-100)' }} />

      {/* SAAS file */}
      <FileSection
        title="SAAS"
        description="Upload the SaaS security assessment document"
        fieldKey="saasFile"
        startup={startup}
        canEdit={canEdit}
      />
    </div>
  )
}
