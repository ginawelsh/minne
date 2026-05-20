import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Home, Check, X, RotateCcw, Keyboard, List, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { getAllDueCards, getDueCards } from '../lib/sm2'
import AudioPlayer from '../components/AudioPlayer'
import type { Card, Deck } from '../types'

type Quality = 0 | 1 | 2 | 3

interface RatingCounts { again: number; hard: number; good: number; easy: number }

// ─── Shared helpers ──────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactElement {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#1c1630;padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:monospace;color:#7c5cbf">$1</code>')
    .replace(/\n/g, '<br/>')
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[a.length][b.length]
}

function checkAnswer(typed: string, correct: string): 'correct' | 'close' | 'wrong' {
  const t = normalize(typed)
  const c = normalize(correct)
  if (t === c) return 'correct'
  const dist = levenshtein(t, c)
  if (dist <= Math.max(1, Math.floor(c.length * 0.15)) && dist <= 3) return 'close'
  return 'wrong'
}

// ─── Rating buttons ───────────────────────────────────────────────────────────

function RatingButtons({ onRate }: { onRate: (q: Quality) => void }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <p className="text-center text-xs text-[#6a5c8a] mb-3 uppercase tracking-widest">
        How well did you know it?
      </p>
      <div className="flex gap-2">
        {[
          { label: 'Again', sub: '< 1 day', color: '#b83860', q: 0 },
          { label: 'Hard', sub: '~1 day', color: '#b85520', q: 1 },
          { label: 'Good', sub: 'few days', color: '#7c5cbf', q: 2 },
          { label: 'Easy', sub: 'week+', color: '#2a8f68', q: 3 }
        ].map(({ label, sub, color, q }) => (
          <button
            key={label}
            onClick={() => onRate(q as Quality)}
            className="flex-1 py-3 rounded-lg text-white text-sm flex flex-col items-center gap-0.5 btn-3d"
            style={{ backgroundColor: color }}
          >
            <span className="font-semibold">{label}</span>
            <span className="text-xs opacity-70">{sub}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── EDIT ANSWER INLINE ──────────────────────────────────────────────────────

function EditAnswerInline({ text, onSave }: { text: string; onSave: (v: string) => void }): React.ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  function startEdit(): void {
    setDraft(text)
    setEditing(true)
    setTimeout(() => taRef.current?.focus(), 0)
  }

  function save(): void {
    const v = draft.trim()
    if (v) onSave(v)
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() }
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div className="w-full space-y-2">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          className="w-full bg-[#0e0b1a] border border-[#7c5cbf] rounded-lg px-3.5 py-2.5 text-[#e8e0f5] text-sm resize-none focus:outline-none"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-[#8878b0] hover:text-[#e8e0f5] text-sm transition-colors">Cancel</button>
          <button onClick={save} className="px-4 py-1.5 rounded-lg text-white text-sm font-medium btn-3d" style={{ backgroundColor: '#7c5cbf' }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1 text-sm text-[#e8e0f5] leading-relaxed">{renderMarkdown(text)}</div>
      <button onClick={startEdit} title="Edit answer" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[#8878b0] hover:text-[#7c5cbf] hover:bg-[#7c5cbf]/10">
        <Pencil size={13} />
      </button>
    </div>
  )
}

// ─── FLIP MODE ────────────────────────────────────────────────────────────────

interface FlipCardProps {
  card: Card
  onRate: (q: Quality) => void
  onUpdateBack: (newBack: string) => void
  onRemoveAudio: (side: 'front' | 'back') => void
}

function FlipCard({ card, onRate, onUpdateBack, onRemoveAudio }: FlipCardProps): React.ReactElement {
  const [flipped, setFlipped] = useState(false)
  const [dontKnow, setDontKnow] = useState(false)
  const [editingAnswer, setEditingAnswer] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!dontKnow) return
    const t = setTimeout(() => onRate(0), 1500)
    return () => clearTimeout(t)
  }, [dontKnow])

  function startEditAnswer(): void {
    setAnswerDraft(card.back)
    setEditingAnswer(true)
    setTimeout(() => taRef.current?.focus(), 50)
  }

  function saveAnswer(): void {
    const v = answerDraft.trim()
    if (v) onUpdateBack(v)
    setEditingAnswer(false)
  }

  return (
    <div className="w-full flex flex-col items-center gap-5">
      <div className="card-container w-full" style={{ height: '280px' }}>
        <div className={`card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front face */}
          <div
            className="card-face bg-[#16112a] rounded-xl border border-[#2a2040] flex flex-col items-center justify-center p-8 cursor-pointer relative"
            onClick={() => setFlipped(true)}
          >
            <div className="text-xs uppercase tracking-widest text-[#6a5c8a] mb-4">Question</div>
            <div className="text-xl font-medium text-[#e8e0f5] text-center leading-relaxed">{renderMarkdown(card.front)}</div>
            {card.audioFront && (
              <div className="absolute top-4 right-4 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <AudioPlayer filename={card.audioFront} autoPlay size="sm" />
                <button onClick={() => onRemoveAudio('front')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
              </div>
            )}
            {!flipped && <div className="absolute bottom-5 text-xs text-[#6a5c8a]">Tap to reveal</div>}
          </div>

          {/* Back face */}
          <div className="card-face card-back-face bg-[#16112a] rounded-xl border border-[#2a2040] flex flex-col items-center justify-center p-8 relative">
            <div className="text-xs uppercase tracking-widest text-[#7c5cbf] mb-4">Answer</div>
            {editingAnswer ? (
              <div className="w-full space-y-3">
                <textarea
                  ref={taRef}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAnswer() }
                    if (e.key === 'Escape') setEditingAnswer(false)
                  }}
                  rows={3}
                  className="w-full bg-[#0e0b1a] border border-[#7c5cbf] rounded-lg px-3.5 py-2.5 text-[#e8e0f5] text-sm resize-none focus:outline-none"
                />
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setEditingAnswer(false)} className="px-3 py-1.5 rounded-lg text-[#8878b0] hover:text-[#e8e0f5] text-sm transition-colors">Cancel</button>
                  <button onClick={saveAnswer} className="px-4 py-1.5 rounded-lg text-white text-sm font-medium btn-3d" style={{ backgroundColor: '#7c5cbf' }}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-xl font-medium text-[#e8e0f5] text-center leading-relaxed">{renderMarkdown(card.back)}</div>
                {flipped && (
                  <button onClick={startEditAnswer} className="mt-3 flex items-center gap-1.5 text-xs text-[#6a5c8a] hover:text-[#8878b0] transition-colors">
                    <Pencil size={10} /> Edit answer
                  </button>
                )}
              </>
            )}
            {card.audioBack && flipped && !editingAnswer && (
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <AudioPlayer key={`back-${card.id}`} filename={card.audioBack} autoPlay size="sm" />
                <button onClick={() => onRemoveAudio('back')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!flipped ? (
          <motion.div key="pre" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-2.5">
            <button
              onClick={() => setFlipped(true)}
              className="px-8 py-3 rounded-lg text-white text-sm font-semibold btn-3d"
              style={{ backgroundColor: '#7c5cbf' }}
            >
              Show Answer
            </button>
            <button
              onClick={() => { setFlipped(true); setDontKnow(true) }}
              className="px-5 py-3 rounded-lg text-white text-sm font-semibold btn-3d"
              style={{ backgroundColor: '#b83860' }}
            >
              Don't know
            </button>
          </motion.div>
        ) : dontKnow ? (
          <motion.div key="again" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#b83860]/15 border border-[#b83860]/40">
            <X size={14} className="text-[#b83860]" />
            <span className="font-medium text-[#b83860] text-sm">Marked as Again — moving on…</span>
          </motion.div>
        ) : (
          <RatingButtons key="rate" onRate={onRate} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── TYPE MODE ────────────────────────────────────────────────────────────────

interface TypeCardProps {
  card: Card
  onRate: (q: Quality) => void
  onUpdateBack: (newBack: string) => void
  onRemoveAudio: (side: 'front' | 'back') => void
}

function TypeCard({ card, onRate, onUpdateBack, onRemoveAudio }: TypeCardProps): React.ReactElement {
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<'correct' | 'close' | 'wrong' | null>(null)
  const [dontKnow, setDontKnow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [card.id])

  useEffect(() => {
    if (!dontKnow) return
    setResult('wrong')
    const t = setTimeout(() => onRate(0), 1500)
    return () => clearTimeout(t)
  }, [dontKnow])

  function handleCheck(): void {
    if (!typed.trim()) return
    setResult(checkAnswer(typed, card.back))
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !result) handleCheck()
  }

  const resultConfig = {
    correct: { color: '#2a8f68', text: 'Correct!' },
    close: { color: '#b89020', text: 'Almost! Check the answer below' },
    wrong: { color: '#b83860', text: 'Not quite — see the correct answer below' }
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Question card */}
      <div className="w-full bg-[#16112a] rounded-xl border border-[#2a2040] p-7 relative">
        <div className="text-xs uppercase tracking-widest text-[#6a5c8a] mb-3">Question</div>
        <div className="text-xl font-medium text-[#e8e0f5] text-center leading-relaxed">{renderMarkdown(card.front)}</div>
        {card.audioFront && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <AudioPlayer filename={card.audioFront} autoPlay size="sm" />
            <button onClick={() => onRemoveAudio('front')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="w-full">
        <div className={`w-full bg-[#0e0b1a] rounded-lg border transition-colors overflow-hidden ${
          result === 'correct' ? 'border-[#2a8f68]' : result === 'close' ? 'border-[#b89020]' : result === 'wrong' ? 'border-[#b83860]' : 'border-[#2a2040] focus-within:border-[#7c5cbf]'
        }`}>
          <div className="flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!result}
              placeholder="Type your answer…"
              className="flex-1 px-4 py-3.5 text-base text-[#e8e0f5] bg-transparent focus:outline-none placeholder:text-[#3d3060]"
            />
            {!result && (
              <div className="flex items-center gap-2 mr-3">
                <button
                  onClick={() => setDontKnow(true)}
                  className="px-3.5 py-2 rounded-lg text-white text-xs font-medium btn-3d"
                  style={{ backgroundColor: '#b83860' }}
                >
                  Don't know
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!typed.trim()}
                  className="px-4 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed btn-3d"
                  style={{ backgroundColor: '#7c5cbf' }}
                >
                  Check
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
          >
            <div
              className="w-full rounded-lg px-4 py-2.5 flex items-center gap-2.5"
              style={{ backgroundColor: resultConfig[result].color + '20', borderLeft: `3px solid ${resultConfig[result].color}` }}
            >
              {result === 'correct' ? (
                <Check size={16} style={{ color: resultConfig[result].color }} />
              ) : (
                <X size={16} style={{ color: resultConfig[result].color }} />
              )}
              <span className="text-sm font-medium text-[#e8e0f5]">{resultConfig[result].text}</span>
            </div>

            {result !== 'correct' && (
              <div className="w-full bg-[#16112a] rounded-lg border border-[#2a2040] p-4">
                <div className="text-xs uppercase tracking-widest text-[#6a5c8a] mb-2">Correct answer</div>
                <EditAnswerInline text={card.back} onSave={onUpdateBack} />
                {card.audioBack && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <AudioPlayer key={`back-${card.id}`} filename={card.audioBack} autoPlay size="sm" label="Hear the answer" />
                    <button onClick={() => onRemoveAudio('back')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
                  </div>
                )}
              </div>
            )}

            {dontKnow ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#b83860]/15 border border-[#b83860]/40">
                <X size={14} className="text-[#b83860]" />
                <span className="font-medium text-[#b83860] text-sm">Marked as Again — moving on…</span>
              </div>
            ) : (
              <RatingButtons onRate={onRate} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── CHOICE MODE ─────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface ChoiceCardProps {
  card: Card
  allCards: Card[]
  onRate: (q: Quality) => void
  onUpdateBack: (newBack: string) => void
  onRemoveAudio: (side: 'front' | 'back') => void
}

function ChoiceCard({ card, allCards, onRate, onUpdateBack, onRemoveAudio }: ChoiceCardProps): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null)
  const [dontKnow, setDontKnow] = useState(false)

  useEffect(() => {
    if (!dontKnow) return
    setSelected('')
    const t = setTimeout(() => onRate(0), 1500)
    return () => clearTimeout(t)
  }, [dontKnow])

  const choices = useMemo(() => {
    const others = allCards.filter((c) => c.id !== card.id && c.back !== card.back)
    const distractors = shuffle(others)
      .slice(0, 3)
      .map((c) => c.back)
    return shuffle([card.back, ...distractors])
  }, [card.id])

  function handleSelect(choice: string): void {
    if (selected !== null) return
    setSelected(choice)
  }

  const isRevealed = selected !== null

  function bgForChoice(choice: string): string {
    if (!isRevealed) return 'bg-[#16112a] border-[#2a2040] text-[#e8e0f5] hover:border-[#3d3060]'
    if (choice === card.back) return 'bg-[#2a8f68]/15 border-[#2a8f68] text-[#e8e0f5]'
    if (choice === selected) return 'bg-[#b83860]/15 border-[#b83860] text-[#e8e0f5]'
    return 'bg-[#16112a] border-[#2a2040] text-[#e8e0f5] opacity-40'
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Question card */}
      <div className="w-full bg-[#16112a] rounded-xl border border-[#2a2040] p-7 relative">
        <div className="text-xs uppercase tracking-widest text-[#6a5c8a] mb-3">Question</div>
        <div className="text-xl font-medium text-[#e8e0f5] text-center leading-relaxed">{renderMarkdown(card.front)}</div>
        {card.audioFront && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <AudioPlayer filename={card.audioFront} autoPlay size="sm" />
            <button onClick={() => onRemoveAudio('front')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
          </div>
        )}
      </div>

      {/* Choices */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        {choices.map((choice, i) => {
          const isCorrect = choice === card.back
          const isChosen = choice === selected
          return (
            <motion.button
              key={i}
              onClick={() => handleSelect(choice)}
              whileHover={!isRevealed ? { scale: 1.02 } : {}}
              whileTap={!isRevealed ? { scale: 0.98 } : {}}
              className={`w-full p-3.5 rounded-lg border text-left transition-colors ${bgForChoice(choice)}`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                  isRevealed && isCorrect ? 'bg-[#2a8f68] text-white' :
                  isRevealed && isChosen && !isCorrect ? 'bg-[#b83860] text-white' :
                  'bg-[#1c1630] text-[#8878b0]'
                }`}>
                  {isRevealed && isCorrect ? <Check size={12} /> : isRevealed && isChosen && !isCorrect ? <X size={12} /> : String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm leading-snug">{choice}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Don't know button */}
      {!isRevealed && (
        <button
          onClick={() => setDontKnow(true)}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium btn-3d"
          style={{ backgroundColor: '#b83860' }}
        >
          Don't know
        </button>
      )}

      {/* Audio reveal + rating */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-3"
          >
            {selected !== card.back && card.audioBack && (
              <div className="flex items-center gap-3 text-sm text-[#8878b0]">
                <AudioPlayer key={`back-${card.id}`} filename={card.audioBack} autoPlay size="sm" label="Hear the answer" />
                <span>Hear the correct answer</span>
                <button onClick={() => onRemoveAudio('back')} title="Remove audio" className="p-1 text-[#6a5c8a] hover:text-[#b83860] transition-colors"><Trash2 size={11} /></button>
              </div>
            )}
            <div className="w-full bg-[#16112a] rounded-lg border border-[#2a2040] p-4">
              <div className="text-xs uppercase tracking-widest text-[#6a5c8a] mb-2">Correct answer</div>
              <EditAnswerInline text={card.back} onSave={onUpdateBack} />
            </div>
            {dontKnow ? (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#b83860]/15 border border-[#b83860]/40">
                <X size={14} className="text-[#b83860]" />
                <span className="font-medium text-[#b83860] text-sm">Marked as Again — moving on…</span>
              </div>
            ) : (
              <RatingButtons onRate={onRate} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── COMPLETION SCREEN ────────────────────────────────────────────────────────

function CompletionScreen({ reviewed, counts, streak, onHome }: { reviewed: number; counts: RatingCounts; streak: number; onHome: () => void }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center min-h-full py-16 px-8 text-center"
    >
      <div className="text-4xl mb-5">✓</div>
      <h1 className="text-2xl font-semibold text-[#e8e0f5] mb-2">Session complete</h1>
      <p className="text-sm text-[#8878b0] mb-8">
        Reviewed <span className="text-[#e8e0f5] font-medium">{reviewed}</span> card{reviewed !== 1 ? 's' : ''}
        {streak > 0 && <> · <span className="text-[#e8e0f5] font-medium">{streak}</span> day streak 🔥</>}
      </p>
      <div className="grid grid-cols-4 gap-2.5 mb-10 w-full max-w-sm">
        {[
          { label: 'Again', count: counts.again, color: '#b83860' },
          { label: 'Hard', count: counts.hard, color: '#b85520' },
          { label: 'Good', count: counts.good, color: '#7c5cbf' },
          { label: 'Easy', count: counts.easy, color: '#2a8f68' }
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-[#16112a] border border-[#2a2040] rounded-lg p-3 flex flex-col items-center gap-1">
            <span className="text-xl font-semibold" style={{ color }}>{count}</span>
            <span className="text-xs text-[#6a5c8a]">{label}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onHome}
        className="flex items-center gap-2 px-8 py-3 rounded-lg text-white text-sm font-semibold btn-3d"
        style={{ backgroundColor: '#7c5cbf' }}
      >
        <Home size={16} /> Back to Home
      </button>
    </motion.div>
  )
}

// ─── MAIN STUDY COMPONENT ─────────────────────────────────────────────────────

const MODE_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  flip: { icon: <RotateCcw size={13} />, label: 'Flip' },
  type: { icon: <Keyboard size={13} />, label: 'Type' },
  choice: { icon: <List size={13} />, label: 'Choice' }
}

export default function Study(): React.ReactElement {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const { decks, cards, reviewCard: doReview, streak, updateCard } = useStore()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [counts, setCounts] = useState<RatingCounts>({ again: 0, hard: 0, good: 0, easy: 0 })
  const [direction, setDirection] = useState(0)

  const studyCards = useMemo(() => {
    if (deckId && deckId !== 'all') return getDueCards(cards, deckId)
    return getAllDueCards(cards)
  }, [cards, deckId])

  const deck: Deck | null = deckId && deckId !== 'all' ? (decks.find((d) => d.id === deckId) ?? null) : null

  useEffect(() => {
    if (studyCards.length === 0 && !sessionDone) navigate('/')
  }, [studyCards.length, sessionDone, navigate])

  const currentCard = studyCards[currentIndex] as Card | undefined
  const totalCards = studyCards.length
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0

  const currentDeck = currentCard ? (decks.find((d) => d.id === currentCard.deckId) ?? null) : null
  const mode = (currentDeck?.mode || 'flip') as 'flip' | 'type' | 'choice'

  const deckCardsForChoice = currentCard ? cards.filter((c) => c.deckId === currentCard.deckId) : []

  function handleUpdateBack(newBack: string): void {
    if (!currentCard) return
    updateCard(currentCard.id, currentCard.front, newBack)
  }

  function handleRemoveAudio(side: 'front' | 'back'): void {
    if (!currentCard) return
    updateCard(
      currentCard.id,
      currentCard.front,
      currentCard.back,
      side === 'front' ? null : undefined,
      side === 'back' ? null : undefined
    )
  }

  function handleRate(quality: Quality): void {
    if (!currentCard) return
    doReview(currentCard.id, quality)
    setCounts((prev) => {
      const next = { ...prev }
      if (quality === 0) next.again++
      else if (quality === 1) next.hard++
      else if (quality === 2) next.good++
      else next.easy++
      return next
    })
    setDirection(1)
    if (currentIndex >= totalCards - 1) {
      setSessionDone(true)
    } else {
      setTimeout(() => setCurrentIndex((i) => i + 1), 100)
    }
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen bg-[#0e0b1a]">
        <CompletionScreen reviewed={totalCards} counts={counts} streak={streak} onHome={() => navigate('/')} />
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0b1a]">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-lg font-semibold text-[#8878b0] mb-5">Nothing to study!</h2>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold btn-3d"
          style={{ backgroundColor: '#7c5cbf' }}
        >
          Back to Home
        </button>
      </div>
    )
  }

  const modeInfo = MODE_LABELS[mode]

  return (
    <div className="min-h-screen bg-[#0e0b1a] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0e0b1a] border-b border-[#2a2040] px-6 py-3.5 flex items-center gap-5">
        <button
          onClick={() => navigate(deck ? `/deck/${deck.id}` : '/')}
          className="flex items-center gap-2 text-[#8878b0] hover:text-[#e8e0f5] text-sm transition-colors group flex-shrink-0"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {deck ? deck.name : 'All Decks'}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-[#6a5c8a] mb-1.5">
            <span>{currentIndex + 1} / {totalCards}</span>
            <div className="flex items-center gap-1.5">
              {modeInfo.icon}
              <span>{modeInfo.label}</span>
            </div>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#2a2040] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: deck?.color || '#7c5cbf' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
        {deck && <span className="text-lg flex-shrink-0">{deck.emoji}</span>}
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-6 py-7 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${mode}`}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {mode === 'flip' && <FlipCard card={currentCard} onRate={handleRate} onUpdateBack={handleUpdateBack} onRemoveAudio={handleRemoveAudio} />}
            {mode === 'type' && <TypeCard key={currentCard.id} card={currentCard} onRate={handleRate} onUpdateBack={handleUpdateBack} onRemoveAudio={handleRemoveAudio} />}
            {mode === 'choice' && (
              <ChoiceCard key={currentCard.id} card={currentCard} allCards={deckCardsForChoice} onRate={handleRate} onUpdateBack={handleUpdateBack} onRemoveAudio={handleRemoveAudio} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
