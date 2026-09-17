'use client'
import { useState, useRef } from 'react'
import { Video, Plus, Trash2, ExternalLink, Play, Upload, Link as LinkIcon, Maximize2, X } from 'lucide-react'
import { useApp } from '@/lib/client/context'
import type { Startup, VideoLink } from '@/lib/shared/types'

function getEmbedUrl(url: string): string | null {
  try {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
    const vm = url.match(/vimeo\.com\/(\d+)/)
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  } catch {}
  return null
}

// Full-screen overlay modal
function VideoModal({ video, embedUrl, onClose }: { video: VideoLink; embedUrl: string | null; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      {/* Header bar */}
      <div style={{ width: '100%', maxWidth: 1100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 8 }}
        onClick={e => e.stopPropagation()}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{video.title}</p>
        <button type="button" onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13 }}>
          <X size={14} /> Close
        </button>
      </div>
      {/* Video */}
      <div style={{ width: '100%', maxWidth: 1100, aspectRatio: '16/9', background: '#000' }}
        onClick={e => e.stopPropagation()}>
        {embedUrl ? (
          <iframe src={embedUrl} title={video.title} allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }} />
        ) : video.localDataUrl ? (
          <video ref={videoRef} controls autoPlay src={video.localDataUrl}
            style={{ width: '100%', height: '100%', background: '#000' }} />
        ) : null}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 }}>Click outside to close</p>
    </div>
  )
}

function VideoCard({ video, canDelete, onDelete }: { video: VideoLink; canDelete: boolean; onDelete: () => void }) {
  const [showPlayer, setShowPlayer] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const embedUrl = video.url ? getEmbedUrl(video.url) : null
  const isLocal  = video.isLocal
  const canPlay  = !!(embedUrl || (isLocal && video.localDataUrl))

  return (
    <>
      {fullscreen && canPlay && (
        <VideoModal video={video} embedUrl={embedUrl} onClose={() => setFullscreen(false)} />
      )}

      <div className="inn-card overflow-hidden">
        {/* Info row */}
        <div className="flex items-start justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isLocal ? 'var(--su-amber-bg)' : 'var(--su-red-bg2)' }}>
              {isLocal ? <Upload size={18} style={{ color: 'var(--su-amber-tx)' }} /> : <Video size={18} style={{ color: '#ef4444' }} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{video.title}</p>
              {video.description && <p className="text-xs font-light truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{video.description}</p>}
              <p className="text-xs font-light mt-0.5" style={{ color: 'var(--faint)' }}>
                {isLocal ? 'Uploaded · ' : 'Link · '}
                {video.addedByName} · {new Date(video.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {canPlay && (
              <button type="button" onClick={() => setShowPlayer(v => !v)}
                className="btn-secondary text-xs">
                <Play size={12} /> {showPlayer ? 'Hide' : 'Play'}
              </button>
            )}
            {video.url && !isLocal && (
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                <ExternalLink size={12} /> Open
              </a>
            )}
            {canDelete && (
              <button type="button" onClick={onDelete} className="btn-ghost text-xs" style={{ color: '#ef4444' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Compact inline player */}
        {showPlayer && canPlay && (
          <div className="border-t" style={{ borderColor: 'var(--gray-100)' }}>
            {/* Player toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--text-primary)' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>{video.title}</p>
              <button type="button" onClick={() => setFullscreen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                <Maximize2 size={12} /> Full screen
              </button>
            </div>
            {/* Compact 320px tall player */}
            <div style={{ height: 280, background: '#000' }}>
              {embedUrl ? (
                <iframe src={embedUrl} title={video.title} allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : video.localDataUrl ? (
                <video ref={videoRef} controls src={video.localDataUrl}
                  style={{ width: '100%', height: '100%', background: '#000' }} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function VideoTab({ startup, canEdit }: { startup: Startup; canEdit: boolean }) {
  const { updateStartup, currentUser } = useApp()
  const [showAdd, setShowAdd]         = useState(false)
  const [addMode, setAddMode]         = useState<'link' | 'upload'>('link')
  const [title, setTitle]             = useState('')
  const [url, setUrl]                 = useState('')
  const [desc, setDesc]               = useState('')
  const [fileName, setFileName]       = useState('')
  const [fileDataUrl, setFileDataUrl] = useState('')

  const videos = startup.videos || []

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''))
    const reader = new FileReader()
    reader.onload = ev => setFileDataUrl(ev.target?.result as string || '')
    reader.readAsDataURL(file)
  }

  const addVideo = () => {
    if (!title.trim()) return
    if (addMode === 'link' && !url.trim()) return
    if (addMode === 'upload' && !fileName) return
    const v: VideoLink = {
      id: `vid${Date.now()}`, title,
      url: addMode === 'link' ? url : '',
      description: desc || undefined,
      addedBy: currentUser.id, addedByName: currentUser.name,
      addedAt: new Date().toISOString(),
      isLocal: addMode === 'upload',
      localDataUrl: addMode === 'upload' ? fileDataUrl : undefined,
      fileName: addMode === 'upload' ? fileName : undefined,
    }
    updateStartup(startup.id, { videos: [...videos, v] })
    setShowAdd(false); setTitle(''); setUrl(''); setDesc(''); setFileName(''); setFileDataUrl('')
  }

  const removeVideo = (id: string) =>
    updateStartup(startup.id, { videos: videos.filter(v => v.id !== id) })

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Videos</h3>
          <p className="text-xs font-light mt-0.5" style={{ color: 'var(--text-muted)' }}>Upload or add YouTube / Vimeo links</p>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setShowAdd(v => !v)} className="btn-primary text-xs">
            <Plus size={13} /> Add video
          </button>
        )}
      </div>

      {showAdd && (
        <div className="inn-card p-5 mb-5 animate-slide-up"
          style={{ opacity: 0, animationFillMode: 'forwards', borderColor: 'var(--aqua-border)' }}>
          <p className="text-xs font-medium tracking-widest mb-4" style={{ color: 'var(--accent)' }}>ADD VIDEO</p>
          <div className="flex gap-2 mb-4">
            {(['upload', 'link'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setAddMode(mode)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: addMode === mode ? 'var(--aqua-light)' : 'var(--surface-2)', color: addMode === mode ? 'var(--accent)' : 'var(--text-muted)', border: `1.5px solid ${addMode === mode ? 'var(--aqua-border)' : 'var(--border)'}`, cursor: 'pointer' }}>
                {mode === 'upload' ? <><Upload size={14} /> Upload</> : <><LinkIcon size={14} /> Add a link</>}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Video title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. BuildScan AI Product Demo" className="inn-input" />
            </div>
            {addMode === 'upload' ? (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Video file *</label>
                <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer hover:bg-[var(--aqua-pale)] transition-colors"
                  style={{ border: '2px dashed var(--aqua-border)', background: 'var(--surface-2)' }}>
                  <Upload size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{fileName || 'Click to select video file'}</p>
                    <p className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>MP4, MOV, AVI, MKV accepted</p>
                  </div>
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Video URL *</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." className="inn-input" />
                <p className="text-[11px] mt-1 font-light" style={{ color: 'var(--text-muted)' }}>YouTube and Vimeo links show an embedded player</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gray-500)' }}>Description (optional)</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="e.g. Live demo from site visit April 2026" className="inn-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs">Cancel</button>
            <button type="button" onClick={addVideo} className="btn-aqua text-xs">Add video</button>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Video size={22} style={{ color: 'var(--faint)' }} />
          </div>
          <h3>No videos added yet</h3>
          <p>Upload a video file or add a YouTube / Vimeo link.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((v, i) => (
            <div key={v.id} className="animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${i * 60}ms` }}>
              <VideoCard video={v} canDelete={canEdit} onDelete={() => removeVideo(v.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
