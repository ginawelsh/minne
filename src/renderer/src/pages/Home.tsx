import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Zap, BookOpen, CreditCard, RotateCcw, Keyboard, List, Globe, Edit2, Trash2, ChevronDown, ChevronRight, Loader, Key, Volume2 } from 'lucide-react'
import { useStore } from '../lib/store'
import DeckCard from '../components/DeckCard'
import type { CardMode, Language } from '../types'
import { TTS_MODELS, TTS_BUILTIN_VOICES, TTS_CUSTOM_VOICES_KEY, TTS_DEFAULT_MODEL } from '../lib/tts'
import type { ElevenLabsVoice } from '../types'

const PRESET_COLORS = [
  '#7c5cbf',
  '#4a86b0',
  '#b89020',
  '#2a8f68',
  '#b83860',
  '#b85520'
]

const DECK_EMOJIS = ['📚', '🧪', '🌍', '💻', '🎵', '✏️']
const LANG_EMOJIS = ['🌍', '🗣️', '🇸🇪', '🇫🇷', '🇩🇪', '🇯🇵', '🇪🇸', '🇮🇹', '🇱🇻', '🇵🇹']

const MODES: { value: CardMode; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'flip', label: 'Flip', sub: 'Reveal & rate', icon: <RotateCcw size={15} /> },
  { value: 'type', label: 'Type', sub: 'Type the answer', icon: <Keyboard size={15} /> },
  { value: 'choice', label: 'Choice', sub: 'Pick from 4', icon: <List size={15} /> }
]

// ─── New Deck Modal ───────────────────────────────────────────────────────────

interface NewDeckModalProps {
  onClose: () => void
  onSubmit: (name: string, description: string, color: string, emoji: string, mode: CardMode) => void
}

function NewDeckModal({ onClose, onSubmit }: NewDeckModalProps): React.ReactElement {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [selectedEmoji, setSelectedEmoji] = useState(DECK_EMOJIS[0])
  const [customEmoji, setCustomEmoji] = useState('')
  const [mode, setMode] = useState<CardMode>('flip')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim(), selectedColor, customEmoji || selectedEmoji, mode)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2040]">
          <h2 className="text-base font-semibold text-[#e8e0f5]">New Deck</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#2a2040] flex items-center justify-center hover:bg-[#3d3060] transition-colors">
            <X size={14} className="text-[#8878b0]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spanish Vocabulary"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] placeholder:text-[#3d3060] focus:border-[#7c5cbf] focus:outline-none text-sm transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] placeholder:text-[#3d3060] focus:border-[#7c5cbf] focus:outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Color</label>
            <div className="flex gap-2.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-lg transition-all duration-150 flex items-center justify-center"
                  style={{
                    backgroundColor: color,
                    opacity: selectedColor === color ? 1 : 0.45,
                    outline: selectedColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px'
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {DECK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { setSelectedEmoji(emoji); setCustomEmoji('') }}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    selectedEmoji === emoji && !customEmoji ? 'bg-[#2a2040] ring-1 ring-[#7c5cbf]' : 'bg-[#1c1630] hover:bg-[#2a2040]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))}
                placeholder="…"
                className="w-9 h-9 rounded-lg bg-[#1c1630] text-center text-lg border border-dashed border-[#2a2040] focus:outline-none focus:border-[#7c5cbf] text-[#e8e0f5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Study Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border transition-colors ${
                    mode === m.value
                      ? 'border-[#7c5cbf] bg-[#7c5cbf]/10 text-[#c4b0f0]'
                      : 'border-[#2a2040] bg-[#1c1630] text-[#8878b0] hover:border-[#3d3060]'
                  }`}
                >
                  {m.icon}
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span className="text-xs opacity-60">{m.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedColor }}
            >
              Create Deck
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Language Modal (create / edit) ──────────────────────────────────────────

interface LanguageModalProps {
  onClose: () => void
  onSubmit: (name: string, emoji: string, color: string, voiceId?: string, voiceName?: string, modelId?: string) => void
  initial?: Language
}

function LanguageModal({ onClose, onSubmit, initial }: LanguageModalProps): React.ReactElement {
  const [name, setName] = useState(initial?.name ?? '')
  const [selectedColor, setSelectedColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [selectedEmoji, setSelectedEmoji] = useState(
    LANG_EMOJIS.includes(initial?.emoji ?? '') ? (initial?.emoji ?? LANG_EMOJIS[0]) : LANG_EMOJIS[0]
  )
  const [customEmoji, setCustomEmoji] = useState(
    initial?.emoji && !LANG_EMOJIS.includes(initial.emoji) ? initial.emoji : ''
  )

  // TTS voice section
  const [showVoice, setShowVoice] = useState(!!initial?.defaultTtsVoiceId)
  const [apiKey, setApiKey] = useState('')
  const [voices, setVoices] = useState<(ElevenLabsVoice & { langHint?: string })[]>([])
  const [customVoices, setCustomVoices] = useState<{ voice_id: string; name: string }[]>([])
  const [selectedVoice, setSelectedVoice] = useState(initial?.defaultTtsVoiceId ?? '')
  const [modelId, setModelId] = useState(initial?.defaultTtsModelId ?? TTS_DEFAULT_MODEL)
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [usingBuiltin, setUsingBuiltin] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  useEffect(() => {
    window.api.settingsGet('elevenLabsApiKey').then((saved) => { if (saved) setApiKey(saved) })
    window.api.settingsGet(TTS_CUSTOM_VOICES_KEY).then((saved) => {
      if (saved) try { setCustomVoices(JSON.parse(saved)) } catch { /* ignore */ }
    })
  }, [])

  useEffect(() => {
    if (showVoice && apiKey && !voicesLoaded) loadVoices(apiKey)
  }, [showVoice])

  async function loadVoices(key: string): Promise<void> {
    if (!key.trim()) return
    setLoadingVoices(true); setVoiceError(''); setUsingBuiltin(false)
    const result = await window.api.elevenLabsGetVoices(key.trim())
    setLoadingVoices(false)
    const isMissingPerm = result.error?.includes('missing_permissions') || result.error?.includes('voices_read')
    if (result.error && !isMissingPerm) { setVoiceError(result.error); return }
    const list = isMissingPerm ? TTS_BUILTIN_VOICES : (result.voices ?? [])
    if (isMissingPerm) setUsingBuiltin(true)
    setVoices(list); setVoicesLoaded(true)
    if (!selectedVoice) {
      const matilda = list.find((v) => v.name === 'Matilda')
      const premade = list.find((v) => v.category === 'premade')
      setSelectedVoice((matilda ?? premade ?? list[0])?.voice_id ?? '')
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    const emoji = customEmoji || selectedEmoji
    const voiceId = showVoice && selectedVoice ? selectedVoice : undefined
    const voiceName = voiceId
      ? ([...customVoices.map((v) => ({ ...v, langHint: undefined })), ...voices].find((v) => v.voice_id === voiceId)?.name ?? voiceId)
      : undefined
    const model = voiceId ? modelId : undefined
    onSubmit(name.trim(), emoji, selectedColor, voiceId, voiceName, model)
    onClose()
  }

  const allVoices = [
    ...customVoices.map((v) => ({ ...v, category: 'custom', langHint: 'My Voice' })),
    ...voices.filter((v) => !customVoices.some((c) => c.voice_id === v.voice_id))
  ]

  const selectedVoiceName = allVoices.find((v) => v.voice_id === selectedVoice)?.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2040] flex-shrink-0">
          <h2 className="text-base font-semibold text-[#e8e0f5]">{initial ? 'Edit Language' : 'Add Language'}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#2a2040] flex items-center justify-center hover:bg-[#3d3060] transition-colors">
            <X size={14} className="text-[#8878b0]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Language Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Swedish, French, Japanese"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] placeholder:text-[#3d3060] focus:border-[#7c5cbf] focus:outline-none text-sm transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {LANG_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { setSelectedEmoji(emoji); setCustomEmoji('') }}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    selectedEmoji === emoji && !customEmoji ? 'bg-[#2a2040] ring-1 ring-[#7c5cbf]' : 'bg-[#1c1630] hover:bg-[#2a2040]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value.slice(0, 2))}
                placeholder="…"
                className="w-9 h-9 rounded-lg bg-[#1c1630] text-center text-lg border border-dashed border-[#2a2040] focus:outline-none focus:border-[#7c5cbf] text-[#e8e0f5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Color</label>
            <div className="flex gap-2.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-lg transition-all duration-150"
                  style={{
                    backgroundColor: color,
                    opacity: selectedColor === color ? 1 : 0.45,
                    outline: selectedColor === color ? `2px solid ${color}` : 'none',
                    outlineOffset: '2px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* TTS Voice preset */}
          <div className="rounded-lg border border-[#2a2040] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowVoice((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#1c1630]"
            >
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-[#6a5c8a]" />
                <span className="text-sm font-medium text-[#8878b0]">Default TTS Voice</span>
                {selectedVoice && showVoice && selectedVoiceName && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}>
                    {selectedVoiceName}
                  </span>
                )}
                {!showVoice && initial?.defaultTtsVoiceName && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}>
                    {initial.defaultTtsVoiceName}
                  </span>
                )}
                {!showVoice && !initial?.defaultTtsVoiceName && (
                  <span className="text-xs text-[#4a3c6a]">optional</span>
                )}
              </div>
              {showVoice ? <ChevronDown size={14} className="text-[#6a5c8a]" /> : <ChevronRight size={14} className="text-[#6a5c8a]" />}
            </button>

            <AnimatePresence>
              {showVoice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-[#2a2040]" style={{ paddingTop: '12px' }}>
                    {/* API Key row */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">
                        <Key size={10} />
                        API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setVoicesLoaded(false) }}
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
                          {loadingVoices ? <Loader size={12} className="animate-spin" /> : 'Load'}
                        </button>
                      </div>
                    </div>

                    {voiceError && (
                      <p className="text-xs text-[#b83860]">{voiceError}</p>
                    )}

                    {usingBuiltin && (
                      <p className="text-xs text-[#b89020]">Using built-in voices — your key lacks voices_read permission.</p>
                    )}

                    {/* Voice list */}
                    {(voicesLoaded || customVoices.length > 0) && (
                      <>
                        <div>
                          <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Voice</label>
                          <div className="space-y-0.5 max-h-40 overflow-y-auto rounded-lg" style={{ border: '1px solid #2a2040' }}>
                            {allVoices.map((v) => {
                              const isSelected = selectedVoice === v.voice_id
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
                                  <span className="text-xs text-[#e8e0f5] flex-1 truncate">{v.name}</span>
                                  {v.langHint && (
                                    <span className="text-[10px] px-1 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(124,92,191,0.15)', color: '#7c5cbf' }}>
                                      {v.langHint}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                            {allVoices.length === 0 && (
                              <div className="px-3 py-3 text-xs text-[#6a5c8a] text-center">Load your API key to see voices</div>
                            )}
                          </div>
                          {selectedVoice && (
                            <button
                              type="button"
                              onClick={() => setSelectedVoice('')}
                              className="mt-1.5 text-xs text-[#6a5c8a] hover:text-[#8878b0] transition-colors"
                            >
                              Clear voice preset
                            </button>
                          )}
                        </div>

                        {/* Model */}
                        <div>
                          <label className="block text-xs text-[#8878b0] mb-1.5 uppercase tracking-wide">Model</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {TTS_MODELS.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setModelId(m.id)}
                                className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all text-center"
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
                      </>
                    )}

                    {!voicesLoaded && customVoices.length === 0 && (
                      <p className="text-xs text-[#4a3c6a]">Enter your API key above to browse and select a default voice for this language.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: selectedColor }}
            >
              {initial ? 'Save Changes' : 'Add Language'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Language Section ─────────────────────────────────────────────────────────

interface LanguageSectionProps {
  language: Language | null
  decks: ReturnType<typeof useStore>['decks']
  getDueCountForDeck: (id: string) => number
  getCardsForDeck: (id: string) => ReturnType<typeof useStore>['cards']
  onNewDeck: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function LanguageSection({ language, decks, getDueCountForDeck, getCardsForDeck, onNewDeck, onEdit, onDelete }: LanguageSectionProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false)
  const totalDue = decks.reduce((sum, d) => sum + getDueCountForDeck(d.id), 0)

  const color = language?.color ?? '#3d3060'
  const label = language ? `${language.emoji} ${language.name}` : 'General'

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#e8e0f5] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={14} className="text-[#6a5c8a]" /> : <ChevronDown size={14} className="text-[#6a5c8a]" />}
          {label}
        </button>
        {totalDue > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(184,56,96,0.15)', color: '#b83860' }}>
            {totalDue} due
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(124,92,191,0.08)', color: '#6a5c8a' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,92,191,0.18)'; e.currentTarget.style.color = '#7c5cbf' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,92,191,0.08)'; e.currentTarget.style.color = '#6a5c8a' }}
              title="Edit language"
            >
              <Edit2 size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(184,56,96,0.08)', color: '#6a5c8a' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,56,96,0.18)'; e.currentTarget.style.color = '#b83860' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(184,56,96,0.08)'; e.currentTarget.style.color = '#6a5c8a' }}
              title="Delete language"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={onNewDeck}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium btn-3d text-white"
            style={{ backgroundColor: color }}
          >
            <Plus size={12} />
            New Deck
          </button>
        </div>
      </div>

      {/* Deck grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {decks.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed text-center"
                style={{ borderColor: `${color}40` }}
              >
                <p className="text-sm text-[#4a3c6a] mb-3">No decks yet</p>
                <button
                  onClick={onNewDeck}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold btn-3d text-white"
                  style={{ backgroundColor: color }}
                >
                  <Plus size={13} />
                  Add first deck
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck, i) => (
                  <motion.div key={deck.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <DeckCard deck={deck} cardCount={getCardsForDeck(deck.id).length} dueCount={getDueCountForDeck(deck.id)} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Delete Language Confirm ──────────────────────────────────────────────────

function DeleteLanguageConfirm({ language, deckCount, onConfirm, onCancel }: {
  language: Language
  deckCount: number
  onConfirm: () => void
  onCancel: () => void
}): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl" style={{ background: `${language.color}22` }}>
            {language.emoji}
          </div>
          <h2 className="text-base font-semibold text-[#e8e0f5]">Delete {language.name}?</h2>
        </div>
        <p className="text-sm text-[#8878b0] mb-5">
          The language section will be removed.{' '}
          {deckCount > 0
            ? `Its ${deckCount} deck${deckCount !== 1 ? 's' : ''} will be moved to General.`
            : 'No decks will be affected.'}
        </p>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
            style={{ backgroundColor: '#b83860' }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home(): React.ReactElement {
  const navigate = useNavigate()
  const {
    decks, cards, languages, streak, dueCount,
    addDeck, addLanguage, updateLanguage, deleteLanguage,
    getDueCountForDeck, getCardsForDeck
  } = useStore()

  const [showNewDeck, setShowNewDeck] = useState(false)
  const [newDeckLanguageId, setNewDeckLanguageId] = useState<string | undefined>(undefined)
  const [showNewLanguage, setShowNewLanguage] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null)
  const [deletingLanguage, setDeletingLanguage] = useState<Language | null>(null)

  function openNewDeck(languageId?: string): void {
    setNewDeckLanguageId(languageId)
    setShowNewDeck(true)
  }

  const knownLanguageIds = new Set(languages.map((l) => l.id))
  const ungroupedDecks = decks.filter((d) => !d.languageId || !knownLanguageIds.has(d.languageId))
  const hasContent = decks.length > 0 || languages.length > 0

  return (
    <div className="retro-bg min-h-screen p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#e8e0f5] tracking-tight">Minne</h1>
          <p className="text-sm text-[#6a5c8a] mt-0.5">Spaced repetition</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-[#16112a] border border-[#2a2040] rounded-lg px-4 py-2">
            <span className="text-lg">🔥</span>
            <div>
              <span className="text-sm font-semibold text-[#e8e0f5]">{streak}</span>
              <span className="text-xs text-[#6a5c8a] ml-1">day streak</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: <Globe size={16} />, value: languages.length, label: 'Languages' },
          { icon: <BookOpen size={16} />, value: decks.length, label: 'Decks' },
          { icon: <CreditCard size={16} />, value: cards.length, label: 'Cards' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="bg-[#16112a] border border-[#2a2040] rounded-lg px-4 py-3 flex items-center gap-3">
            <span className="text-[#6a5c8a]">{icon}</span>
            <div>
              <div className="text-lg font-semibold text-[#e8e0f5] leading-none">{value}</div>
              <div className="text-xs text-[#6a5c8a] mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Study All button */}
      <AnimatePresence>
        {dueCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-6">
            <button
              onClick={() => navigate('/study-all')}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 btn-3d"
              style={{ backgroundColor: '#7c5cbf' }}
            >
              <Zap size={16} />
              Study {dueCount} due card{dueCount !== 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasContent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#16112a] border border-[#2a2040] flex items-center justify-center mb-4 text-3xl">
            🌍
          </div>
          <h3 className="text-base font-semibold text-[#8878b0] mb-1">Start learning</h3>
          <p className="text-sm text-[#4a3c6a] mb-6 max-w-xs">
            Add a language to organize your decks by subject, or jump straight in with a deck.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNewLanguage(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
              style={{ backgroundColor: '#7c5cbf' }}
            >
              <Globe size={16} />
              Add Language
            </button>
            <button
              onClick={() => openNewDeck(undefined)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[#8878b0] text-sm font-medium bg-[#16112a] border border-[#2a2040] hover:bg-[#1c1630] transition-colors"
            >
              <Plus size={16} />
              New Deck
            </button>
          </div>
        </motion.div>
      )}

      {/* Language sections + Add Language button */}
      {hasContent && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium text-[#8878b0] uppercase tracking-wide">My Languages</h2>
            <button
              onClick={() => setShowNewLanguage(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium btn-3d"
              style={{ backgroundColor: '#7c5cbf' }}
            >
              <Globe size={14} />
              Add Language
            </button>
          </div>

          {languages.map((lang) => (
            <LanguageSection
              key={lang.id}
              language={lang}
              decks={decks.filter((d) => d.languageId === lang.id)}
              getDueCountForDeck={getDueCountForDeck}
              getCardsForDeck={getCardsForDeck}
              onNewDeck={() => openNewDeck(lang.id)}
              onEdit={() => setEditingLanguage(lang)}
              onDelete={() => setDeletingLanguage(lang)}
            />
          ))}

          {/* General / ungrouped section */}
          <LanguageSection
            language={null}
            decks={ungroupedDecks}
            getDueCountForDeck={getDueCountForDeck}
            getCardsForDeck={getCardsForDeck}
            onNewDeck={() => openNewDeck(undefined)}
          />
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewDeck && (
          <NewDeckModal
            onClose={() => setShowNewDeck(false)}
            onSubmit={(name, description, color, emoji, mode) =>
              addDeck(name, description, color, emoji, mode, newDeckLanguageId)
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewLanguage && (
          <LanguageModal
            onClose={() => setShowNewLanguage(false)}
            onSubmit={(name, emoji, color, voiceId, voiceName, modelId) =>
              addLanguage(name, emoji, color, voiceId, voiceName, modelId)
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingLanguage && (
          <LanguageModal
            initial={editingLanguage}
            onClose={() => setEditingLanguage(null)}
            onSubmit={(name, emoji, color, voiceId, voiceName, modelId) => {
              updateLanguage(editingLanguage.id, {
                name, emoji, color,
                defaultTtsVoiceId: voiceId,
                defaultTtsVoiceName: voiceName,
                defaultTtsModelId: modelId
              })
              setEditingLanguage(null)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingLanguage && (
          <DeleteLanguageConfirm
            language={deletingLanguage}
            deckCount={decks.filter((d) => d.languageId === deletingLanguage.id).length}
            onConfirm={() => { deleteLanguage(deletingLanguage.id); setDeletingLanguage(null) }}
            onCancel={() => setDeletingLanguage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
