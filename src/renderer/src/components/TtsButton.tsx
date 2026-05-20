import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Loader, Key, Volume2, Play, Square, Plus, Trash2 } from 'lucide-react'
import type { ElevenLabsVoice } from '../types'
import { TTS_MODELS, TTS_BUILTIN_VOICES, TTS_CUSTOM_VOICES_KEY, TTS_PREVIEW_TEXT, TTS_DEFAULT_MODEL } from '../lib/tts'

interface CustomVoice {
  voice_id: string
  name: string
}

interface TtsButtonProps {
  text: string
  onGenerated: (filename: string) => void
  defaultVoiceId?: string
  defaultModelId?: string
}

export default function TtsButton({ text, onGenerated, defaultVoiceId, defaultModelId }: TtsButtonProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [saveKey, setSaveKey] = useState(true)
  const [voices, setVoices] = useState<(ElevenLabsVoice & { langHint?: string })[]>([])
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [modelId, setModelId] = useState(defaultModelId ?? TTS_DEFAULT_MODEL)
  const [editText, setEditText] = useState(text)
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewingVoiceId, setPreviewingVoiceId] = useState('')
  const [error, setError] = useState('')
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [usingBuiltinVoices, setUsingBuiltinVoices] = useState(false)
  const [showAddVoice, setShowAddVoice] = useState(false)
  const [newVoiceId, setNewVoiceId] = useState('')
  const [newVoiceName, setNewVoiceName] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setEditText(text)
      setError('')
      window.api.settingsGet(TTS_CUSTOM_VOICES_KEY).then((saved) => {
        if (saved) {
          try { setCustomVoices(JSON.parse(saved)) } catch { /* ignore */ }
        }
      })
      window.api.settingsGet('elevenLabsApiKey').then((saved) => {
        if (saved) {
          setApiKey(saved)
          loadVoices(saved)
        }
      })
    } else {
      stopPreview()
    }
  }, [isOpen, text])

  async function saveCustomVoices(updated: CustomVoice[]): Promise<void> {
    setCustomVoices(updated)
    await window.api.settingsSet(TTS_CUSTOM_VOICES_KEY, JSON.stringify(updated))
  }

  async function handleAddVoice(): Promise<void> {
    const id = newVoiceId.trim()
    const name = newVoiceName.trim() || 'My Voice'
    if (!id) return
    if (customVoices.some((v) => v.voice_id === id)) {
      setNewVoiceId(''); setNewVoiceName(''); setShowAddVoice(false); setSelectedVoice(id); return
    }
    const updated = [{ voice_id: id, name }, ...customVoices]
    await saveCustomVoices(updated)
    setSelectedVoice(id); setNewVoiceId(''); setNewVoiceName(''); setShowAddVoice(false)
  }

  async function handleRemoveCustomVoice(voiceId: string): Promise<void> {
    const updated = customVoices.filter((v) => v.voice_id !== voiceId)
    await saveCustomVoices(updated)
    if (selectedVoice === voiceId) {
      const fallback = (customVoices.find((v) => v.voice_id !== voiceId) ?? voices[0])?.voice_id ?? ''
      setSelectedVoice(fallback)
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
    const isMissingPermission = result.error?.includes('missing_permissions') || result.error?.includes('voices_read')
    if (result.error && !isMissingPermission) { setError(result.error); setVoicesLoaded(false); return }
    const list = isMissingPermission ? TTS_BUILTIN_VOICES : (result.voices ?? [])
    if (isMissingPermission) setUsingBuiltinVoices(true)
    setVoices(list); setVoicesLoaded(true)
    setSelectedVoice((prev) => {
      if (prev) return prev
      if (defaultVoiceId) return defaultVoiceId
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
    const previewText = editText.trim().slice(0, 120) || TTS_PREVIEW_TEXT
    const result = await window.api.elevenLabsPreview({ text: previewText, voiceId, apiKey: apiKey.trim(), modelId })
    if (result.error) { setPreviewing(false); setPreviewingVoiceId(''); setError(result.error); return }
    if (result.dataUrl) {
      const audio = new Audio(result.dataUrl)
      audioRef.current = audio
      audio.onended = () => { setPreviewing(false); setPreviewingVoiceId(''); audioRef.current = null }
      audio.onerror = () => { setPreviewing(false); setPreviewingVoiceId(''); audioRef.current = null }
      audio.play().catch(() => { setPreviewing(false); setPreviewingVoiceId('') })
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!editText.trim() || !selectedVoice || !apiKey.trim()) return
    stopPreview(); setGenerating(true); setError('')
    if (saveKey) await window.api.settingsSet('elevenLabsApiKey', apiKey.trim())
    const result = await window.api.elevenLabsGenerate({ text: editText.trim(), voiceId: selectedVoice, apiKey: apiKey.trim(), modelId })
    setGenerating(false)
    if (result.error) { setError(result.error); return }
    if (result.filename) { onGenerated(result.filename); setIsOpen(false) }
  }

  const allVoices: (ElevenLabsVoice & { langHint?: string; isCustom?: boolean })[] = [
    ...customVoices.map((v) => ({ ...v, category: 'custom', isCustom: true as const, langHint: 'My Voice' })),
    ...voices.filter((v) => !customVoices.some((c) => c.voice_id === v.voice_id))
  ]

  const selectedVoiceData = allVoices.find((v) => v.voice_id === selectedVoice)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: 'rgba(124,92,191,0.12)', border: '1px solid rgba(124,92,191,0.35)', color: '#7c5cbf' }}
      >
        <Sparkles size={11} />
        AI Voice
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md mx-4 rounded-xl overflow-hidden"
              style={{ background: '#16112a', border: '1px solid #2a2040' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #2a2040' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7c5cbf' }}>
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#e8e0f5]">ElevenLabs TTS</h3>
                    <p className="text-xs text-[#6a5c8a]">Generate AI voice audio</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: '#1c1630', color: '#8878b0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2040')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1630')}
                >
                  <X size={13} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* API Key */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">
                    <Key size={11} />
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setVoicesLoaded(false) }}
                      onKeyDown={(e) => e.key === 'Enter' && loadVoices(apiKey)}
                      placeholder="sk_..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none transition-colors"
                      style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')}
                    />
                    <button
                      type="button"
                      onClick={() => loadVoices(apiKey)}
                      disabled={!apiKey.trim() || loadingVoices}
                      className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-40 transition-all btn-3d"
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

                {/* Voice + Model */}
                {(voicesLoaded || customVoices.length > 0) && (
                  <>
                    {/* Model */}
                    <div>
                      <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Model</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TTS_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setModelId(m.id)}
                            className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all duration-150 text-center"
                            style={
                              modelId === m.id
                                ? { background: 'rgba(124,92,191,0.15)', border: '1px solid rgba(124,92,191,0.5)', color: '#7c5cbf' }
                                : { background: '#0e0b1a', border: '1px solid #2a2040', color: '#8878b0' }
                            }
                          >
                            <span className="text-xs font-medium leading-tight">{m.label}</span>
                            <span className="text-[10px] opacity-70 leading-tight">{m.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice list */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="flex items-center gap-1.5 text-xs text-[#8878b0] uppercase tracking-wide">
                          <Volume2 size={11} />
                          Voice
                          {selectedVoiceData?.langHint && (
                            <span
                              className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                              style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf', border: '1px solid rgba(124,92,191,0.3)' }}
                            >
                              {selectedVoiceData.langHint}
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddVoice((v) => !v)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors"
                          style={{ background: 'rgba(124,92,191,0.1)', color: '#7c5cbf', border: '1px solid rgba(124,92,191,0.25)' }}
                        >
                          <Plus size={10} />
                          Add my voice
                        </button>
                      </div>

                      <AnimatePresence>
                        {showAddVoice && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-lg p-3 mb-2 space-y-2" style={{ background: 'rgba(124,92,191,0.07)', border: '1px solid rgba(124,92,191,0.2)' }}>
                              <p className="text-[10px] text-[#8878b0] leading-relaxed">
                                Find your Voice ID in the ElevenLabs dashboard → Voices → click a voice → copy the ID shown below the name.
                              </p>
                              <input
                                type="text"
                                value={newVoiceId}
                                onChange={(e) => setNewVoiceId(e.target.value)}
                                placeholder="Voice ID (e.g. abc123xyz…)"
                                className="w-full px-3 py-1.5 rounded-lg text-xs font-mono text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none"
                                style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newVoiceName}
                                  onChange={(e) => setNewVoiceName(e.target.value)}
                                  placeholder="Display name (optional)"
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none"
                                  style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                                  onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')}
                                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddVoice()}
                                />
                                <button
                                  type="button"
                                  onClick={handleAddVoice}
                                  disabled={!newVoiceId.trim()}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                                  style={{ background: '#7c5cbf', color: 'white' }}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="space-y-0.5 max-h-44 overflow-y-auto rounded-lg" style={{ border: '1px solid #2a2040' }}>
                        {allVoices.map((v) => {
                          const isSelected = selectedVoice === v.voice_id
                          const isThisPreviewing = previewingVoiceId === v.voice_id && previewing
                          return (
                            <div
                              key={v.voice_id}
                              onClick={() => setSelectedVoice(v.voice_id)}
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                              style={{
                                background: isSelected ? 'rgba(124,92,191,0.12)' : 'transparent',
                                borderLeft: isSelected ? '2px solid #7c5cbf' : '2px solid transparent'
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-[#e8e0f5] truncate">{v.name}</span>
                                  {v.langHint && (
                                    <span
                                      className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
                                      style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}
                                    >
                                      {v.langHint}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#6a5c8a] capitalize">{v.isCustom ? 'saved voice ID' : v.category}</div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handlePreview(v.voice_id) }}
                                  disabled={previewing && previewingVoiceId !== v.voice_id}
                                  title={isThisPreviewing ? 'Stop preview' : 'Preview voice'}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                                  style={
                                    isThisPreviewing
                                      ? { background: 'rgba(184,56,96,0.2)', color: '#b83860' }
                                      : { background: 'rgba(124,92,191,0.12)', color: '#7c5cbf' }
                                  }
                                >
                                  {isThisPreviewing
                                    ? <Square size={9} fill="currentColor" />
                                    : <Play size={9} fill="currentColor" />}
                                </button>
                                {v.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveCustomVoice(v.voice_id) }}
                                    title="Remove saved voice"
                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                                    style={{ background: 'rgba(184,56,96,0.1)', color: '#b83860' }}
                                  >
                                    <Trash2 size={9} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {allVoices.length === 0 && (
                          <div className="px-3 py-4 text-xs text-[#6a5c8a] text-center">
                            Load your API key or add a voice ID above
                          </div>
                        )}
                      </div>
                      {previewing && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#7c5cbf]">
                          <Loader size={10} className="animate-spin" />
                          <span>Previewing {allVoices.find((v) => v.voice_id === previewingVoiceId)?.name}…</span>
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div>
                      <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Text to speak</label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-[#e8e0f5] placeholder:text-[#3d3060] focus:outline-none resize-none transition-colors"
                        style={{ background: '#0e0b1a', border: '1px solid #2a2040' }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#7c5cbf')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2040')}
                      />
                      <p className="text-[10px] text-[#6a5c8a] mt-1">Preview plays up to 120 characters of this text</p>
                    </div>
                  </>
                )}

                {usingBuiltinVoices && (
                  <div className="text-xs rounded-lg px-3 py-2.5 leading-relaxed" style={{ background: 'rgba(184,144,32,0.08)', border: '1px solid rgba(184,144,32,0.25)', color: '#b89020' }}>
                    <span className="font-medium">Using built-in voices</span> — your key lacks <code className="font-mono opacity-80">voices_read</code>. Use <strong>Add my voice</strong> above to import any of your ElevenLabs voices by ID.
                  </div>
                )}

                {error && (
                  <div className="text-xs text-[#b83860] rounded-lg px-3 py-2" style={{ background: 'rgba(184,56,96,0.1)', border: '1px solid rgba(184,56,96,0.3)' }}>
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm text-[#8878b0] font-medium transition-colors"
                    style={{ background: '#1c1630' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2040')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1630')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={(!voicesLoaded && customVoices.length === 0) || !selectedVoice || !editText.trim() || generating}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed btn-3d flex items-center justify-center gap-2"
                    style={{ background: '#7c5cbf' }}
                  >
                    {generating ? (
                      <><Loader size={14} className="animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles size={14} /> Generate & Save</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
