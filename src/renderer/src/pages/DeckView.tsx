import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit2, Trash2, Zap, X, AlertTriangle, Music, Mic, FileSpreadsheet, CheckCircle2, RotateCcw, Keyboard, List, Settings, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import AudioPlayer from '../components/AudioPlayer'
import TtsButton from '../components/TtsButton'
import BulkTtsModal from '../components/BulkTtsModal'
import type { Card, CardMode, Deck } from '../types'

const MODE_OPTIONS: { value: CardMode; icon: React.ReactNode; label: string }[] = [
  { value: 'flip', icon: <RotateCcw size={14} />, label: 'Flip' },
  { value: 'type', icon: <Keyboard size={14} />, label: 'Type' },
  { value: 'choice', icon: <List size={14} />, label: 'Choice' }
]

const PRESET_COLORS = ['#7c5cbf', '#4a86b0', '#b89020', '#2a8f68', '#b83860', '#b85520']
const PRESET_EMOJIS = ['📚', '🧪', '🌍', '💻', '🎵', '✏️']

interface CardModalProps {
  initial?: { front: string; back: string; audioFront?: string; audioBack?: string }
  onClose: () => void
  onSave: (front: string, back: string, audioFront?: string | null, audioBack?: string | null) => void
  title: string
  defaultVoiceId?: string
  defaultModelId?: string
}

function AudioPickerRow({
  label,
  text,
  filename,
  onPick,
  onRemove,
  onGenerated,
  defaultVoiceId,
  defaultModelId
}: {
  label: string
  text: string
  filename?: string
  onPick: () => void
  onRemove: () => void
  onGenerated: (filename: string) => void
  defaultVoiceId?: string
  defaultModelId?: string
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 mt-2">
      <Mic size={14} className="text-[#6a5c8a] flex-shrink-0" />
      <span className="text-xs text-[#6a5c8a] w-24 flex-shrink-0">{label} audio</span>
      {filename ? (
        <div className="flex items-center gap-2 flex-1">
          <AudioPlayer filename={filename} size="sm" />
          <span className="text-xs text-[#8878b0] truncate flex-1">Audio attached</span>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-[#b83860] hover:underline flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-xs hover:bg-[#2a2040] transition-colors"
          >
            <Music size={12} />
            Import file
          </button>
          <TtsButton text={text} onGenerated={onGenerated} defaultVoiceId={defaultVoiceId} defaultModelId={defaultModelId} />
        </div>
      )}
    </div>
  )
}

function CardModal({ initial, onClose, onSave, title, defaultVoiceId, defaultModelId }: CardModalProps): React.ReactElement {
  const [front, setFront] = useState(initial?.front || '')
  const [back, setBack] = useState(initial?.back || '')
  const [audioFront, setAudioFront] = useState<string | null>(initial?.audioFront || null)
  const [audioBack, setAudioBack] = useState<string | null>(initial?.audioBack || null)
  const [pickingAudio, setPickingAudio] = useState(false)

  async function pickAudio(side: 'front' | 'back'): Promise<void> {
    setPickingAudio(true)
    try {
      const filename = await window.api.openAudioDialog()
      if (filename) {
        if (side === 'front') setAudioFront(filename)
        else setAudioBack(filename)
      }
    } finally {
      setPickingAudio(false)
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    onSave(
      front.trim(),
      back.trim(),
      audioFront !== initial?.audioFront ? audioFront : undefined,
      audioBack !== initial?.audioBack ? audioBack : undefined
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2040]">
          <h2 className="text-base font-semibold text-[#e8e0f5]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#1c1630] flex items-center justify-center hover:bg-[#2a2040] transition-colors"
          >
            <X size={14} className="text-[#8878b0]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Front (Question)</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Enter the question or term..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] placeholder:text-[#3d3060] focus:border-[#7c5cbf] focus:outline-none text-sm resize-none transition-colors"
              autoFocus
            />
            <AudioPickerRow
              label="Front"
              text={front}
              filename={audioFront ?? undefined}
              onPick={() => pickAudio('front')}
              onRemove={() => setAudioFront(null)}
              onGenerated={(f) => setAudioFront(f)}
              defaultVoiceId={defaultVoiceId}
              defaultModelId={defaultModelId}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Back (Answer)</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Enter the answer or definition..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] placeholder:text-[#3d3060] focus:border-[#7c5cbf] focus:outline-none text-sm resize-none transition-colors"
            />
            <AudioPickerRow
              label="Back"
              text={back}
              filename={audioBack ?? undefined}
              onPick={() => pickAudio('back')}
              onRemove={() => setAudioBack(null)}
              onGenerated={(f) => setAudioBack(f)}
              defaultVoiceId={defaultVoiceId}
              defaultModelId={defaultModelId}
            />
          </div>

          <p className="text-xs text-[#6a5c8a]">Markdown supported · MP3, WAV, OGG, M4A accepted</p>

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
              disabled={!front.trim() || !back.trim() || pickingAudio}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#7c5cbf' }}
            >
              Save Card
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

interface DeleteConfirmProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirm({ message, onConfirm, onCancel }: DeleteConfirmProps): React.ReactElement {
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
          <div className="w-10 h-10 rounded-lg bg-[#b83860]/15 flex items-center justify-center">
            <AlertTriangle size={18} className="text-[#b83860]" />
          </div>
          <h2 className="text-base font-semibold text-[#e8e0f5]">Are you sure?</h2>
        </div>
        <p className="text-sm text-[#8878b0] mb-5">{message}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors"
          >
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

interface EditDeckModalProps {
  deck: Deck
  onClose: () => void
  onSave: (updates: { name: string; description: string; color: string; emoji: string }) => void
}

function EditDeckModal({ deck, onClose, onSave }: EditDeckModalProps): React.ReactElement {
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description)
  const [selectedColor, setSelectedColor] = useState(deck.color)
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS.includes(deck.emoji) ? deck.emoji : PRESET_EMOJIS[0])
  const [customEmoji, setCustomEmoji] = useState(PRESET_EMOJIS.includes(deck.emoji) ? '' : deck.emoji)

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), color: selectedColor, emoji: customEmoji || selectedEmoji })
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
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{customEmoji || selectedEmoji}</span>
            <h2 className="text-base font-semibold text-[#e8e0f5]">Edit Deck</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#1c1630] flex items-center justify-center hover:bg-[#2a2040] transition-colors"
          >
            <X size={14} className="text-[#8878b0]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Deck Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2a2040] bg-[#0e0b1a] text-[#e8e0f5] focus:border-[#7c5cbf] focus:outline-none text-sm transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8878b0] mb-1.5 uppercase tracking-wide">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
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
            <label className="block text-xs font-medium text-[#8878b0] mb-2 uppercase tracking-wide">Emoji</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_EMOJIS.map((emoji) => (
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
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function renderMarkdownBasic(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-[#1c1630] px-1 rounded text-sm font-mono text-[#7c5cbf]">$1</code>')
    .replace(/\n/g, '<br/>')
}

interface CardItemProps {
  card: Card
  onEdit: (card: Card) => void
  onDelete: (cardId: string) => void
  isDue: boolean
}

function CardItem({ card, onEdit, onDelete, isDue }: CardItemProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-[#16112a] rounded-lg border border-[#2a2040] p-4 hover:border-[#3d3060] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#6a5c8a] uppercase tracking-wide mb-1">Front</div>
              <div
                className="text-[#e8e0f5] text-sm leading-relaxed line-clamp-3"
                dangerouslySetInnerHTML={{ __html: renderMarkdownBasic(card.front) }}
              />
            </div>
            <div>
              <div className="text-xs text-[#6a5c8a] uppercase tracking-wide mb-1">Back</div>
              <div
                className="text-[#8878b0] text-sm leading-relaxed line-clamp-3"
                dangerouslySetInnerHTML={{ __html: renderMarkdownBasic(card.back) }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {isDue && (
              <span className="text-xs text-[#b83860] bg-[#b83860]/10 px-2 py-0.5 rounded-full">
                Due now
              </span>
            )}
            {card.audioFront && (
              <span className="flex items-center gap-1 text-xs text-[#8878b0] bg-[#1c1630] px-2 py-0.5 rounded-full">
                <Music size={10} /> Front audio
              </span>
            )}
            {card.audioBack && (
              <span className="flex items-center gap-1 text-xs text-[#8878b0] bg-[#1c1630] px-2 py-0.5 rounded-full">
                <Music size={10} /> Back audio
              </span>
            )}
            <span className="text-xs text-[#6a5c8a]">
              Interval: {card.interval}d · EF: {card.easeFactor.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onEdit(card)}
            className="w-8 h-8 rounded-lg bg-[#1c1630] hover:bg-[#7c5cbf]/15 text-[#8878b0] hover:text-[#7c5cbf] flex items-center justify-center transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(card.id)}
            className="w-8 h-8 rounded-lg bg-[#1c1630] hover:bg-[#b83860]/15 text-[#8878b0] hover:text-[#b83860] flex items-center justify-center transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

interface BulkDeleteAudioModalProps {
  cards: Card[]
  onClose: () => void
  onConfirm: (side: 'front' | 'back' | 'both') => void
}

function BulkDeleteAudioModal({ cards, onClose, onConfirm }: BulkDeleteAudioModalProps): React.ReactElement {
  const [selected, setSelected] = useState<'front' | 'back' | 'both'>('both')

  const frontCount = cards.filter((c) => c.audioFront).length
  const backCount = cards.filter((c) => c.audioBack).length
  const bothCount = cards.filter((c) => c.audioFront || c.audioBack).length

  const options: { value: 'front' | 'back' | 'both'; label: string; count: number }[] = [
    { value: 'front', label: 'Front audio only', count: frontCount },
    { value: 'back', label: 'Back audio only', count: backCount },
    { value: 'both', label: 'All audio', count: bothCount },
  ]

  const affectedCount = options.find((o) => o.value === selected)?.count ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#b83860]/15 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-[#b83860]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#e8e0f5]">Bulk Delete Audio</h2>
            <p className="text-xs text-[#8878b0]">Remove audio from all cards in this deck</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                selected === opt.value
                  ? 'border-[#b83860] bg-[#b83860]/10'
                  : 'border-[#2a2040] bg-[#1c1630] hover:border-[#3d3060]'
              }`}
            >
              <span className={`text-sm ${selected === opt.value ? 'text-[#e8e0f5] font-medium' : 'text-[#8878b0]'}`}>{opt.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selected === opt.value ? 'bg-[#b83860]/20 text-[#b83860]' : 'bg-[#2a2040] text-[#6a5c8a]'
              }`}>{opt.count} card{opt.count !== 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>

        {affectedCount === 0 ? (
          <p className="text-xs text-[#6a5c8a] text-center mb-4">No cards have that type of audio.</p>
        ) : (
          <p className="text-sm text-[#8878b0] text-center mb-4">
            Permanently removes audio from <span className="text-[#b83860] font-semibold">{affectedCount}</span> card{affectedCount !== 1 ? 's' : ''}.
          </p>
        )}

        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(selected); onClose() }}
            disabled={affectedCount === 0}
            className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#b83860' }}
          >
            Delete Audio
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function parseCsvRow(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

function parseCsv(text: string): Array<{ front: string; back: string }> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l)
  if (!lines.length) return []
  const rows = lines.map(parseCsvRow)
  const firstRow = rows[0]
  const looksLikeHeader =
    firstRow.length >= 2 &&
    /^[a-z_\s]+$/i.test(firstRow[0]) &&
    firstRow[0].length < 20 &&
    !firstRow[0].includes(' ')
  const dataRows = looksLikeHeader ? rows.slice(1) : rows
  return dataRows
    .filter((r) => r.length >= 2 && r[0] && r[1])
    .map((r) => ({ front: r[0], back: r[1] }))
}

interface CsvImportModalProps {
  onClose: () => void
  onImport: (rows: Array<{ front: string; back: string }>) => void
}

function CsvImportModal({ onClose, onImport }: CsvImportModalProps): React.ReactElement {
  const [rows, setRows] = useState<Array<{ front: string; back: string }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePickFile(): Promise<void> {
    setLoading(true)
    setError('')
    try {
      const csvText = await window.api.openCsvDialog()
      if (!csvText) { setLoading(false); return }
      const parsed = parseCsv(csvText)
      if (!parsed.length) { setError('No valid rows found. Make sure the CSV has two columns: front,back'); setLoading(false); return }
      setRows(parsed)
    } catch {
      setError('Failed to read file.')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm(): void {
    if (rows) onImport(rows)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#2a2040] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2a8f68]/15 flex items-center justify-center">
              <FileSpreadsheet size={17} className="text-[#2a8f68]" />
            </div>
            <h2 className="text-base font-semibold text-[#e8e0f5]">Import from CSV</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-[#1c1630] flex items-center justify-center hover:bg-[#2a2040] transition-colors">
            <X size={14} className="text-[#8878b0]" />
          </button>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {!rows ? (
            <div className="space-y-4">
              <div className="bg-[#1c1630] rounded-lg p-4 space-y-2 border border-[#2a2040]">
                <p className="font-medium text-[#e8e0f5] text-xs uppercase tracking-wide">Expected format</p>
                <p className="font-mono text-xs bg-[#0e0b1a] rounded-lg px-3 py-2 border border-[#2a2040] text-[#8878b0]">front,back</p>
                <p className="font-mono text-xs bg-[#0e0b1a] rounded-lg px-3 py-2 border border-[#2a2040] text-[#8878b0]">What is H₂O?,Water</p>
                <p className="font-mono text-xs bg-[#0e0b1a] rounded-lg px-3 py-2 border border-[#2a2040] text-[#8878b0]">"Bonjour, ami","Hello, friend"</p>
                <p className="text-xs text-[#6a5c8a]">Header row is auto-detected and skipped. Quoted fields supported.</p>
              </div>
              {error && <p className="text-sm text-[#b83860] bg-[#b83860]/10 rounded-lg px-4 py-3">{error}</p>}
              <button
                onClick={handlePickFile}
                disabled={loading}
                className="w-full py-3 rounded-lg text-white text-sm font-semibold btn-3d disabled:opacity-50"
                style={{ backgroundColor: '#2a8f68' }}
              >
                {loading ? 'Reading file…' : 'Choose CSV File'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-[#2a8f68]">
                <CheckCircle2 size={16} />
                {rows.length} card{rows.length !== 1 ? 's' : ''} ready to import
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {rows.slice(0, 50).map((row, i) => (
                  <div key={i} className="bg-[#1c1630] rounded-lg px-4 py-2.5 text-sm grid grid-cols-2 gap-3 border border-[#2a2040]">
                    <span className="text-[#e8e0f5] truncate">{row.front}</span>
                    <span className="text-[#8878b0] truncate">{row.back}</span>
                  </div>
                ))}
                {rows.length > 50 && (
                  <p className="text-xs text-[#6a5c8a] text-center py-1">…and {rows.length - 50} more</p>
                )}
              </div>
              <div className="flex gap-2.5 pt-1">
                <button onClick={() => setRows(null)} className="flex-1 py-2.5 rounded-lg bg-[#1c1630] text-[#8878b0] text-sm font-medium hover:bg-[#2a2040] transition-colors">
                  Choose Different File
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
                  style={{ backgroundColor: '#2a8f68' }}
                >
                  Import {rows.length} Cards
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function DeckView(): React.ReactElement {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const { decks, languages, addCard, updateCard, deleteCard, getDueCountForDeck, getCardsForDeck, deleteDeck, updateDeck, updateDeckMode } = useStore()

  const [showAddCard, setShowAddCard] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [deletingDeck, setDeletingDeck] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [editingDeck, setEditingDeck] = useState(false)
  const [showBulkTts, setShowBulkTts] = useState(false)
  const [showBulkDeleteAudio, setShowBulkDeleteAudio] = useState(false)

  const deck = decks.find((d) => d.id === deckId)
  const deckCards = deckId ? getCardsForDeck(deckId) : []
  const dueCount = deckId ? getDueCountForDeck(deckId) : 0
  const deckLanguage = deck?.languageId ? languages.find((l) => l.id === deck.languageId) : undefined

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0e0b1a]">
        <h2 className="text-lg font-semibold text-[#8878b0] mb-4">Deck not found</h2>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
          style={{ backgroundColor: '#7c5cbf' }}
        >
          Go Home
        </button>
      </div>
    )
  }

  function handleDeleteDeck(): void {
    deleteDeck(deck!.id)
    navigate('/')
  }

  function handleBulkDeleteAudio(side: 'front' | 'back' | 'both'): void {
    deckCards.forEach((card) => {
      const removeFront = (side === 'front' || side === 'both') && card.audioFront
      const removeBack = (side === 'back' || side === 'both') && card.audioBack
      if (removeFront || removeBack) {
        updateCard(
          card.id,
          card.front,
          card.back,
          removeFront ? null : undefined,
          removeBack ? null : undefined
        )
      }
    })
  }

  return (
    <div className="retro-bg min-h-screen p-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-[#8878b0] hover:text-[#e8e0f5] text-sm font-medium mb-6 transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      {/* Deck header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#16112a] border border-[#2a2040] rounded-xl overflow-hidden mb-6"
      >
        <div className="h-1" style={{ backgroundColor: deck.color }} />
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: deck.color + '22' }}
          >
            {deck.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-[#e8e0f5] leading-tight">{deck.name}</h1>
            {deck.description && (
              <p className="text-sm text-[#8878b0] mt-0.5">{deck.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-[#6a5c8a]">
                {deckCards.length} card{deckCards.length !== 1 ? 's' : ''}
              </span>
              {dueCount > 0 && (
                <span className="text-xs text-[#b83860] bg-[#b83860]/10 px-2 py-0.5 rounded-full">
                  {dueCount} due
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c1630] text-[#8878b0] text-xs font-medium hover:bg-[#2a2040] hover:text-[#e8e0f5] transition-colors"
            >
              <FileSpreadsheet size={14} />
              Import CSV
            </button>
            {deckCards.length > 0 && (
              <button
                onClick={() => setShowBulkTts(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(124,92,191,0.12)', color: '#7c5cbf', border: '1px solid rgba(124,92,191,0.3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,92,191,0.2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,92,191,0.12)' }}
              >
                <Sparkles size={14} />
                AI Audio
              </button>
            )}
            {deckCards.some((c) => c.audioFront || c.audioBack) && (
              <button
                onClick={() => setShowBulkDeleteAudio(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(184,56,96,0.10)', color: '#b83860', border: '1px solid rgba(184,56,96,0.25)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,56,96,0.20)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,56,96,0.10)' }}
              >
                <Trash2 size={14} />
                Delete Audio
              </button>
            )}
            <button
              onClick={() => setShowAddCard(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c1630] text-[#8878b0] text-xs font-medium hover:bg-[#2a2040] hover:text-[#e8e0f5] transition-colors"
            >
              <Plus size={14} />
              Add Card
            </button>
            <button
              onClick={() => {
                if (dueCount > 0) navigate(`/study/${deck.id}`)
              }}
              disabled={dueCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold btn-3d disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: deck.color }}
            >
              <Zap size={14} />
              {dueCount > 0 ? `Study (${dueCount})` : 'All caught up!'}
            </button>
            <button
              onClick={() => setEditingDeck(true)}
              className="w-8 h-8 rounded-lg bg-[#1c1630] hover:bg-[#7c5cbf]/15 text-[#8878b0] hover:text-[#7c5cbf] flex items-center justify-center transition-colors"
              title="Edit deck"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => setDeletingDeck(true)}
              className="w-8 h-8 rounded-lg bg-[#1c1630] hover:bg-[#b83860]/15 text-[#8878b0] hover:text-[#b83860] flex items-center justify-center transition-colors"
              title="Delete deck"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="px-5 pb-4 flex items-center gap-3 border-t border-[#2a2040] pt-3">
          <span className="text-xs text-[#6a5c8a] uppercase tracking-wide">Study mode</span>
          <div className="flex gap-1.5">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.value}
                onClick={() => updateDeckMode(deck.id, m.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  (deck.mode || 'flip') === m.value
                    ? 'text-white'
                    : 'bg-[#1c1630] text-[#8878b0] hover:bg-[#2a2040]'
                }`}
                style={(deck.mode || 'flip') === m.value ? { backgroundColor: deck.color } : {}}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Cards list */}
      {deckCards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="text-4xl mb-4">🃏</div>
          <h3 className="text-base font-semibold text-[#8878b0] mb-1.5">No cards yet</h3>
          <p className="text-sm text-[#6a5c8a] mb-6">
            Add your first card to start studying this deck.
          </p>
          <button
            onClick={() => setShowAddCard(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
            style={{ backgroundColor: deck.color }}
          >
            <Plus size={16} />
            Add First Card
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {deckCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                isDue={Date.now() >= card.dueDate}
                onEdit={(c) => setEditingCard(c)}
                onDelete={(id) => setDeletingCardId(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showAddCard && (
          <CardModal
            title="Add New Card"
            onClose={() => setShowAddCard(false)}
            onSave={(front, back, audioFront, audioBack) => {
              addCard(deck.id, front, back, audioFront ?? undefined, audioBack ?? undefined)
            }}
            defaultVoiceId={deckLanguage?.defaultTtsVoiceId}
            defaultModelId={deckLanguage?.defaultTtsModelId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCard && (
          <CardModal
            title="Edit Card"
            initial={{ front: editingCard.front, back: editingCard.back, audioFront: editingCard.audioFront, audioBack: editingCard.audioBack }}
            onClose={() => setEditingCard(null)}
            onSave={(front, back, audioFront, audioBack) => {
              updateCard(editingCard.id, front, back, audioFront, audioBack)
              setEditingCard(null)
            }}
            defaultVoiceId={deckLanguage?.defaultTtsVoiceId}
            defaultModelId={deckLanguage?.defaultTtsModelId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingCardId && (
          <DeleteConfirm
            message="This card and all its study history will be permanently deleted."
            onConfirm={() => {
              deleteCard(deletingCardId)
              setDeletingCardId(null)
            }}
            onCancel={() => setDeletingCardId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingDeck && (
          <DeleteConfirm
            message={`Delete "${deck.name}" and all its ${deckCards.length} card${deckCards.length !== 1 ? 's' : ''}? This cannot be undone.`}
            onConfirm={handleDeleteDeck}
            onCancel={() => setDeletingDeck(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCsvImport && (
          <CsvImportModal
            onClose={() => setShowCsvImport(false)}
            onImport={(rows) => {
              rows.forEach((row) => addCard(deck.id, row.front, row.back))
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingDeck && (
          <EditDeckModal
            deck={deck}
            onClose={() => setEditingDeck(false)}
            onSave={(updates) => {
              updateDeck(deck.id, updates)
              setEditingDeck(false)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteAudio && (
          <BulkDeleteAudioModal
            cards={deckCards}
            onClose={() => setShowBulkDeleteAudio(false)}
            onConfirm={handleBulkDeleteAudio}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkTts && (
          <BulkTtsModal
            deckName={deck.name}
            cards={deckCards}
            onClose={() => setShowBulkTts(false)}
            onCardAudioSaved={(cardId, side, filename, oldFilename) => {
              const card = deckCards.find((c) => c.id === cardId)
              if (!card) return
              if (oldFilename) window.api.deleteAudio(oldFilename).catch(() => {})
              if (side === 'front') {
                updateCard(cardId, card.front, card.back, filename, undefined)
              } else {
                updateCard(cardId, card.front, card.back, undefined, filename)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
