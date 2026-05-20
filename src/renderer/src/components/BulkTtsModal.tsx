import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Loader, Key, Volume2, Play, Square, Plus, Trash2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import type { Card, ElevenLabsVoice } from '../types'

const MODELS = [
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', sub: 'Best for Swedish' },
  { id: 'eleven_turbo_v2', label: 'Turbo v2', sub: 'English only' },
  { id: 'eleven_monolingual_v1', label: 'Classic v1', sub: 'English only' }
]

const BUILTIN_VOICES: (ElevenLabsVoice & { langHint?: string })[] = [
  { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', category: 'premade', langHint: 'Swedish ★' },
  { voice_id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', category: 'premade', langHint: 'Swedish ★' },
  { voice_id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', category: 'premade', langHint: 'Multilingual' },
  { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', langHint: 'Multilingual' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade' },
  { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Callum', category: 'premade' },
]

const CUSTOM_VOICES_KEY = 'ttsCustomVoices'
const DELAY_MS = 600

interface CustomVoice { voice_id: string; name: string }

type Side = 'front' | 'back' | 'both'
type Filter = 'missing' | 'all'

interface CardJob {
  card: Card
  side: 'front' | 'back'
  text: string
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped'
  error?: string
}

export interface BulkTtsModalProps {
  deckName: string
  cards: Card[]
  onClose: () => void
  onCardAudioSaved: (cardId: string, side: 'front' | 'back', filename: string, oldFilename?: string) => void
}

export default function BulkTtsModal({ deckName, cards, onClose, onCardAudioSaved }: BulkTtsModalProps): React.ReactElement {
  const [apiKey, setApiKey] = useState('')
  const [saveKey, setSaveKey] = useState(true)
  const [voices, setVoices] = useState<(ElevenLabsVoice & { langHint?: string })[]>([])
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [modelId, setModelId] = useState('eleven_multilingual_v2')
  const [side, setSide] = useState<Side>('front')
  const [filter, setFilter] = useState<Filter>('missing')
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [usingBuiltinVoices, setUsingBuiltinVoices] = useState(false)
  const [error, setError] = useState('')
  const [showAddVoice, setShowAddVoice] = useState(false)
  const [newVoiceId, setNewVoiceId] = useState('')
  const [newVoiceName, setNewVoiceName] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [previewingVoiceId, setPreviewingVoiceId] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config')
  const [jobs, setJobs] = useState<CardJob[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    window.api.settingsGet(CUSTOM_VOICES_KEY).then((saved) => {
      if (saved) { try { setCustomVoices(JSON.parse(saved)) } catch { /* ignore */ } }
    })
    window.api.settingsGet('elevenLabsApiKey').then((saved) => {
      if (saved) { setApiKey(saved); loadVoices(saved) }
    })
    return () => { stopPreview() }
  }, [])

  async function saveCustomVoices(updated: CustomVoice[]): Promise<void> {
    setCustomVoices(updated)
    await window.api.settingsSet(CUSTOM_VOICES_KEY, JSON.stringify(updated))
  }

  async function handleAddVoice(): Promise<void> {
    const id = newVoiceId.trim()
    const name = newVoiceName.trim() || 'My Voice'
    if (!id) return
    if (customVoices.some((v) => v.voice_id === id)) {
      setSelectedVoice(id); setNewVoiceId(''); setNewVoiceName(''); setShowAddVoice(false); return
    }
    const updated = [{ voice_id: id, name }, ...customVoices]
    await saveCustomVoices(updated)
    setSelectedVoice(id); setNewVoiceId(''); setNewVoiceName(''); setShowAddVoice(false)
  }

  async function handleRemoveCustomVoice(voiceId: string): Promise<void> {
    const updated = customVoices.filter((v) => v.voice_id !== voiceId)
    await saveCustomVoices(updated)
    if (selectedVoice === voiceId) {
      setSelectedVoice((customVoices.find((v) => v.voice_id !== voiceId) ?? voices[0])?.voice_id ?? '')
    }
  }

  function stopPreview(): void {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPreviewing(false); setPreviewingVoiceId('')
  }

  async function loadVoices(key: string): Promise<void> {
    if (!key.trim()) return
    setLoadingVoices(true); setError(''); setUsingBuiltinVoices(false)
    const result = await window.api.elevenLabsGetVoices(key.trim())
    setLoadingVoices(false)
    const isMissing = result.error?.includes('missing_permissions') || result.error?.includes('voices_read')
    if (result.error && !isMissing) { setError(result.error); return }
    const list = isMissing ? BUILTIN_VOICES : (result.voices ?? [])
    if (isMissing) setUsingBuiltinVoices(true)
    setVoices(list); setVoicesLoaded(true)
    setSelectedVoice((prev) => {
      if (prev) return prev
      const matilda = list.find((v) => v.name === 'Matilda')
      const premade = list.find((v) => v.category === 'premade')
      return (matilda ?? premade ?? list[0])?.voice_id ?? ''
    })
  }

  async function handlePreview(voiceId: string): Promise<void> {
    if (!apiKey.trim() || !voiceId) return
    if (previewingVoiceId === voiceId && previewing) { stopPreview(); return }
    stopPreview()
    setPreviewing(true); setPreviewingVoiceId(voiceId); setError('')
    const result = await window.api.elevenLabsPreview({ text: 'Hej! Det här är ett röstexempel.', voiceId, apiKey: apiKey.trim(), modelId })
    if (result.error) { setPreviewing(false); setPreviewingVoiceId(''); setError(result.error); return }
    if (result.dataUrl) {
      const audio = new Audio(result.dataUrl)
      audioRef.current = audio
      audio.onended = () => { setPreviewing(false); setPreviewingVoiceId(''); audioRef.current = null }
      audio.onerror = () => { setPreviewing(false); setPreviewingVoiceId(''); audioRef.current = null }
      audio.play().catch(() => { setPreviewing(false); setPreviewingVoiceId('') })
    }
  }

  function buildJobs(): CardJob[] {
    const result: CardJob[] = []
    const sides: ('front' | 'back')[] = side === 'both' ? ['front', 'back'] : [side]
    for (const card of cards) {
      for (const s of sides) {
        const hasAudio = s === 'front' ? !!card.audioFront : !!card.audioBack
        if (filter === 'missing' && hasAudio) continue
        const cardText = s === 'front' ? card.front : card.back
        if (!cardText.trim()) continue
        result.push({ card, side: s, text: cardText, status: 'pending' })
      }
    }
    return result
  }

  const previewJobs = buildJobs()

  async function handleStart(): Promise<void> {
    if (!selectedVoice || !apiKey.trim()) return
    stopPreview()
    if (saveKey) await window.api.settingsSet('elevenLabsApiKey', apiKey.trim())
    const jobList = buildJobs()
    if (!jobList.length) return
    setJobs(jobList); setCurrentIdx(0); setPhase('running'); cancelRef.current = false

    for (let i = 0; i < jobList.length; i++) {
      if (cancelRef.current) {
        setJobs((prev) => prev.map((j, idx) => idx >= i ? { ...j, status: 'skipped' } : j))
        break
      }
      setCurrentIdx(i)
      setJobs((prev) => prev.map((j, idx) => idx === i ? { ...j, status: 'running' } : j))
      const job = jobList[i]
      const result = await window.api.elevenLabsGenerate({ text: job.text, voiceId: selectedVoice, apiKey: apiKey.trim(), modelId })
      if (result.error) {
        setJobs((prev) => prev.map((j, idx) => idx === i ? { ...j, status: 'error', error: result.error } : j))
      } else if (result.filename) {
        const oldFilename = job.side === 'front' ? job.card.audioFront : job.card.audioBack
        onCardAudioSaved(job.card.id, job.side, result.filename, oldFilename)
        setJobs((prev) => prev.map((j, idx) => idx === i ? { ...j, status: 'done' } : j))
      }
      if (i < jobList.length - 1 && !cancelRef.current) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }
    setPhase('done')
  }

  function handleCancel(): void {
    cancelRef.current = true
  }

  const allVoices: (ElevenLabsVoice & { langHint?: string; isCustom?: boolean })[] = [
    ...customVoices.map((v) => ({ ...v, category: 'custom', isCustom: true as const, langHint: 'My Voice' })),
    ...voices.filter((v) => !customVoices.some((c) => c.voice_id === v.voice_id))
  ]

  const doneCount = jobs.filter((j) => j.status === 'done').length
  const errorCount = jobs.filter((j) => j.status === 'error').length
  const progress = jobs.length ? (jobs.filter((j) => j.status !== 'pending' && j.status !== 'running').length / jobs.length) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: '#16112a', border: '1px solid #2a2040' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a2040' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7c5cbf' }}>
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e8e0f5]">Bulk Generate Audio</h3>
              <p className="text-xs text-[#6a5c8a] truncate max-w-[240px]">{deckName}</p>
            </div>
          </div>
          {phase !== 'running' && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
              style={{ background: '#1c1630', color: '#8878b0' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2040')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1630')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Config phase */}
          {phase === 'config' && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide"><Key size={11} />API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setVoicesLoaded(false) }}
                    onKeyDown={(e) => e.key === 'Enter' && loadVoices(apiKey)}
                    placeholder="sk_..."
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none"
                    style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')}
                  />
                  <button
                    type="button"
                    onClick={() => loadVoices(apiKey)}
                    disabled={!apiKey.trim() || loadingVoices}
                    className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40 btn-3d"
                    style={{ background: '#7c5cbf', color: 'white' }}
                  >
                    {loadingVoices ? <Loader size={13} className="animate-spin" /> : 'Load'}
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                  <input type="checkbox" checked={saveKey} onChange={(e) => setSaveKey(e.target.checked)} className="accent-[#7c5cbf]" />
                  <span className="text-xs text-[#6a5c8a]">Save API key on this device</span>
                </label>
              </div>

              {(voicesLoaded || customVoices.length > 0) && (
                <>
                  {/* Model */}
                  <div>
                    <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Model</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MODELS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setModelId(m.id)}
                          className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all text-center"
                          style={modelId === m.id
                            ? { background: 'rgba(124,92,191,0.15)', border: '1px solid rgba(124,92,191,0.5)', color: '#7c5cbf' }
                            : { background: '#0e0b1a', border: '1px solid #2a2040', color: '#8878b0' }}
                        >
                          <span className="text-xs font-medium leading-tight">{m.label}</span>
                          <span className="text-[10px] opacity-70 leading-tight">{m.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="flex items-center gap-1.5 text-xs text-[#8878b0] uppercase tracking-wide"><Volume2 size={11} />Voice</label>
                      <button type="button" onClick={() => setShowAddVoice((v) => !v)}
                        className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(124,92,191,0.1)', color: '#7c5cbf', border: '1px solid rgba(124,92,191,0.25)' }}>
                        <Plus size={10} />Add my voice
                      </button>
                    </div>

                    <AnimatePresence>
                      {showAddVoice && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div className="rounded-lg p-3 mb-2 space-y-2" style={{ background: 'rgba(124,92,191,0.07)', border: '1px solid rgba(124,92,191,0.2)' }}>
                            <p className="text-[10px] text-[#8878b0]">Find your Voice ID in the ElevenLabs dashboard → Voices → click a voice → copy the ID.</p>
                            <input type="text" value={newVoiceId} onChange={(e) => setNewVoiceId(e.target.value)} placeholder="Voice ID"
                              className="w-full px-3 py-1.5 rounded-lg text-xs font-mono text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none"
                              style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')} onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')} />
                            <div className="flex gap-2">
                              <input type="text" value={newVoiceName} onChange={(e) => setNewVoiceName(e.target.value)} placeholder="Display name (optional)"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddVoice()}
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none"
                                style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')} onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')} />
                              <button type="button" onClick={handleAddVoice} disabled={!newVoiceId.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                                style={{ background: '#7c5cbf', color: 'white' }}>Add</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-0.5 max-h-36 overflow-y-auto rounded-lg" style={{ border: '1px solid #2a2040' }}>
                      {allVoices.map((v) => {
                        const isSelected = selectedVoice === v.voice_id
                        const isThisPreviewing = previewingVoiceId === v.voice_id && previewing
                        return (
                          <div key={v.voice_id} onClick={() => setSelectedVoice(v.voice_id)}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                            style={{ background: isSelected ? 'rgba(124,92,191,0.12)' : 'transparent', borderLeft: isSelected ? '2px solid #7c5cbf' : '2px solid transparent' }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#e8e0f5] truncate">{v.name}</span>
                                {v.langHint && (
                                  <span className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
                                    style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}>
                                    {v.langHint}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#6a5c8a] capitalize">{v.isCustom ? 'saved voice ID' : v.category}</div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button type="button" onClick={(e) => { e.stopPropagation(); handlePreview(v.voice_id) }}
                                disabled={previewing && previewingVoiceId !== v.voice_id}
                                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                                style={isThisPreviewing ? { background: 'rgba(184,56,96,0.2)', color: '#b83860' } : { background: 'rgba(124,92,191,0.12)', color: '#7c5cbf' }}>
                                {isThisPreviewing ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                              </button>
                              {v.isCustom && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveCustomVoice(v.voice_id) }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(184,56,96,0.1)', color: '#b83860' }}>
                                  <Trash2 size={9} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Side + Filter */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Generate for</label>
                      <div className="flex gap-1.5">
                        {(['front', 'back', 'both'] as Side[]).map((s) => (
                          <button key={s} type="button" onClick={() => setSide(s)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                            style={side === s ? { background: 'rgba(124,92,191,0.2)', border: '1px solid rgba(124,92,191,0.5)', color: '#7c5cbf' } : { background: '#0e0b1a', border: '1px solid #2a2040', color: '#8878b0' }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Cards</label>
                      <div className="flex gap-1.5">
                        {[{ id: 'missing' as Filter, label: 'Missing audio' }, { id: 'all' as Filter, label: 'All cards' }].map((f) => (
                          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={filter === f.id ? { background: 'rgba(124,92,191,0.2)', border: '1px solid rgba(124,92,191,0.5)', color: '#7c5cbf' } : { background: '#0e0b1a', border: '1px solid #2a2040', color: '#8878b0' }}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview count */}
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(124,92,191,0.06)', border: '1px solid rgba(124,92,191,0.15)' }}>
                    {previewJobs.length === 0 ? (
                      <span className="text-[#6a5c8a]">No cards match this filter.</span>
                    ) : (
                      <span className="text-[#7c5cbf]">
                        {previewJobs.length} generation{previewJobs.length !== 1 ? 's' : ''} queued
                        <span className="text-[#6a5c8a] font-normal"> · ~{Math.ceil(previewJobs.length * (DELAY_MS + 2000) / 1000)}s estimated</span>
                      </span>
                    )}
                  </div>
                </>
              )}

              {usingBuiltinVoices && (
                <div className="text-xs rounded-lg px-3 py-2.5 leading-relaxed" style={{ background: 'rgba(184,144,32,0.08)', border: '1px solid rgba(184,144,32,0.25)', color: '#b89020' }}>
                  <span className="font-medium">Using built-in voices</span> — add your own voice ID with "Add my voice" above.
                </div>
              )}
              {error && (
                <div className="text-xs text-[#b83860] rounded-lg px-3 py-2" style={{ background: 'rgba(184,56,96,0.1)', border: '1px solid rgba(184,56,96,0.3)' }}>{error}</div>
              )}
            </>
          )}

          {/* Running / Done phase */}
          {(phase === 'running' || phase === 'done') && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#8878b0]">
                    {phase === 'running' ? `Generating ${currentIdx + 1} of ${jobs.length}…` : 'Complete'}
                  </span>
                  <span className="text-xs text-[#e8e0f5] font-medium">{Math.round(progress * 100)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: '#2a2040' }}>
                  <motion.div
                    className="h-1.5 rounded-full"
                    style={{ background: '#7c5cbf' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span style={{ color: '#2a8f68' }}>✓ {doneCount} done</span>
                  {errorCount > 0 && <span style={{ color: '#b83860' }}>✗ {errorCount} failed</span>}
                  <span className="text-[#6a5c8a]">{jobs.length - doneCount - errorCount - jobs.filter(j => j.status === 'skipped').length} remaining</span>
                </div>
              </div>

              <div className="space-y-0.5 max-h-64 overflow-y-auto rounded-lg" style={{ border: '1px solid #2a2040' }}>
                {jobs.map((job, i) => (
                  <div key={`${job.card.id}-${job.side}`}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {job.status === 'pending' && <div className="w-2 h-2 rounded-full" style={{ background: '#2a2040' }} />}
                      {job.status === 'running' && <Loader size={14} className="animate-spin" style={{ color: '#7c5cbf' }} />}
                      {job.status === 'done' && <CheckCircle2 size={14} style={{ color: '#2a8f68' }} />}
                      {job.status === 'error' && <AlertCircle size={14} style={{ color: '#b83860' }} />}
                      {job.status === 'skipped' && <div className="w-2 h-2 rounded-full" style={{ background: '#3d3060' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#e8e0f5] truncate">{job.card.front.slice(0, 40)}{job.card.front.length > 40 ? '…' : ''}</span>
                        <span className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}>
                          {job.side}
                        </span>
                      </div>
                      {job.error && <div className="text-[10px] truncate mt-0.5" style={{ color: '#b83860' }}>{job.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2.5 flex-shrink-0" style={{ borderTop: '1px solid #2a2040', paddingTop: '16px' }}>
          {phase === 'config' && (
            <>
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm text-[#8878b0] font-medium transition-colors"
                style={{ background: '#1c1630' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2040')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1630')}>
                Cancel
              </button>
              <button type="button" onClick={handleStart}
                disabled={(!voicesLoaded && customVoices.length === 0) || !selectedVoice || previewJobs.length === 0}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed btn-3d flex items-center justify-center gap-2"
                style={{ background: '#7c5cbf' }}>
                <Sparkles size={14} />
                Generate {previewJobs.length} audio{previewJobs.length !== 1 ? 's' : ''}
                <ChevronRight size={14} />
              </button>
            </>
          )}
          {phase === 'running' && (
            <button type="button" onClick={handleCancel}
              className="flex-1 py-2.5 rounded-lg text-sm text-[#8878b0] font-medium transition-colors"
              style={{ background: '#1c1630' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2040')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1630')}>
              Stop
            </button>
          )}
          {phase === 'done' && (
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white btn-3d flex items-center justify-center gap-2"
              style={{ background: '#2a8f68' }}>
              <CheckCircle2 size={14} />
              Done — {doneCount} generated
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
