import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import type { Deck } from '../types'

interface DeckCardProps {
  deck: Deck
  cardCount: number
  dueCount: number
}

export default function DeckCard({ deck, cardCount, dueCount }: DeckCardProps): React.ReactElement {
  const navigate = useNavigate()

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="bg-[#16112a] border border-[#2a2040] rounded-xl overflow-hidden cursor-pointer flex flex-col hover:border-[#3d3060] transition-colors"
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: deck.color }} />

      <div className="p-4 flex flex-col flex-1">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl mb-3"
          style={{ backgroundColor: deck.color + '22' }}
        >
          {deck.emoji}
        </div>

        <h3 className="text-sm font-semibold text-[#e8e0f5] leading-tight mb-1 line-clamp-2">
          {deck.name}
        </h3>

        {deck.description && (
          <p className="text-xs text-[#8878b0] mb-3 line-clamp-2 flex-1">
            {deck.description}
          </p>
        )}

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-[#6a5c8a]">
              {cardCount} card{cardCount !== 1 ? 's' : ''}
            </span>
            {dueCount > 0 && (
              <span className="text-xs font-medium text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: deck.color }}>
                {dueCount} due
              </span>
            )}
          </div>

          {dueCount > 0 && (
            <button
              className="w-full py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 btn-3d"
              style={{ backgroundColor: deck.color }}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/study/${deck.id}`)
              }}
            >
              <Zap size={13} />
              Study Now
            </button>
          )}

          {dueCount === 0 && cardCount > 0 && (
            <div className="w-full py-2 rounded-lg bg-[#1c1630] text-[#6a5c8a] text-xs text-center">
              All caught up
            </div>
          )}

          {cardCount === 0 && (
            <div className="w-full py-2 rounded-lg bg-[#1c1630] text-[#6a5c8a] text-xs text-center">
              No cards yet
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
