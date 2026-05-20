import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { AppData, Card, CardMode, Deck, Language } from '../types'
import { reviewCard as sm2Review, createNewCard, getAllDueCards, getDueCards } from './sm2'

interface StoreContextType {
  decks: Deck[]
  cards: Card[]
  languages: Language[]
  streak: number
  dueCount: number
  loaded: boolean
  addDeck: (name: string, description: string, color: string, emoji: string, mode: CardMode, languageId?: string) => void
  deleteDeck: (deckId: string) => void
  updateDeck: (deckId: string, updates: { name: string; description: string; color: string; emoji: string }) => void
  updateDeckMode: (deckId: string, mode: CardMode) => void
  addCard: (deckId: string, front: string, back: string, audioFront?: string, audioBack?: string) => void
  updateCard: (cardId: string, front: string, back: string, audioFront?: string | null, audioBack?: string | null) => void
  deleteCard: (cardId: string) => void
  reviewCard: (cardId: string, quality: 0 | 1 | 2 | 3) => void
  getDueCountForDeck: (deckId: string) => number
  getCardsForDeck: (deckId: string) => Card[]
  addLanguage: (name: string, emoji: string, color: string, defaultTtsVoiceId?: string, defaultTtsVoiceName?: string, defaultTtsModelId?: string) => void
  deleteLanguage: (languageId: string) => void
  updateLanguage: (languageId: string, updates: Partial<Pick<Language, 'name' | 'emoji' | 'color' | 'defaultTtsVoiceId' | 'defaultTtsVoiceName' | 'defaultTtsModelId'>>) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function calculateStreak(currentStreak: number, lastStudyDate: string): { streak: number; lastStudyDate: string } {
  const today = getTodayString()
  if (lastStudyDate === today) {
    return { streak: currentStreak, lastStudyDate }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (lastStudyDate === yesterdayStr) {
    return { streak: currentStreak + 1, lastStudyDate: today }
  }

  if (!lastStudyDate) {
    return { streak: 1, lastStudyDate: today }
  }

  return { streak: 1, lastStudyDate: today }
}

export function StoreProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [decks, setDecks] = useState<Deck[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [streak, setStreak] = useState(0)
  const [lastStudyDate, setLastStudyDate] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const data = await window.api.load()
        setDecks(data.decks || [])
        setCards(data.cards || [])
        setLanguages(data.languages || [])
        setStreak(data.streak || 0)
        setLastStudyDate(data.lastStudyDate || '')
      } catch (err) {
        console.error('Failed to load data:', err)
        setDecks([])
        setCards([])
        setLanguages([])
        setStreak(0)
        setLastStudyDate('')
      } finally {
        setLoaded(true)
      }
    }
    loadData()
  }, [])

  const persist = useCallback(
    (
      nextDecks: Deck[],
      nextCards: Card[],
      nextStreak: number,
      nextLastStudy: string,
      nextLanguages: Language[]
    ) => {
      const data: AppData = {
        decks: nextDecks,
        cards: nextCards,
        streak: nextStreak,
        lastStudyDate: nextLastStudy,
        languages: nextLanguages
      }
      window.api.save(data).catch((err) => console.error('Save failed:', err))
    },
    []
  )

  const addDeck = useCallback(
    (name: string, description: string, color: string, emoji: string, mode: CardMode = 'flip', languageId?: string) => {
      const deck: Deck = {
        id: crypto.randomUUID(),
        name,
        description,
        color,
        emoji,
        mode,
        createdAt: Date.now(),
        ...(languageId ? { languageId } : {})
      }
      setDecks((prev) => {
        const next = [...prev, deck]
        persist(next, cards, streak, lastStudyDate, languages)
        return next
      })
    },
    [cards, streak, lastStudyDate, languages, persist]
  )

  const updateDeck = useCallback(
    (deckId: string, updates: { name: string; description: string; color: string; emoji: string }) => {
      setDecks((prev) => {
        const next = prev.map((d) => (d.id === deckId ? { ...d, ...updates } : d))
        persist(next, cards, streak, lastStudyDate, languages)
        return next
      })
    },
    [cards, streak, lastStudyDate, languages, persist]
  )

  const updateDeckMode = useCallback(
    (deckId: string, mode: CardMode) => {
      setDecks((prev) => {
        const next = prev.map((d) => (d.id === deckId ? { ...d, mode } : d))
        persist(next, cards, streak, lastStudyDate, languages)
        return next
      })
    },
    [cards, streak, lastStudyDate, languages, persist]
  )

  const deleteDeck = useCallback(
    (deckId: string) => {
      setDecks((prevDecks) => {
        setCards((prevCards) => {
          const nextCards = prevCards.filter((c) => c.deckId !== deckId)
          const nextDecks = prevDecks.filter((d) => d.id !== deckId)
          persist(nextDecks, nextCards, streak, lastStudyDate, languages)
          return nextCards
        })
        return prevDecks.filter((d) => d.id !== deckId)
      })
    },
    [streak, lastStudyDate, languages, persist]
  )

  const addCard = useCallback(
    (deckId: string, front: string, back: string, audioFront?: string, audioBack?: string) => {
      const card = createNewCard(crypto.randomUUID(), deckId, front, back)
      if (audioFront) card.audioFront = audioFront
      if (audioBack) card.audioBack = audioBack
      setCards((prev) => {
        const next = [...prev, card]
        persist(decks, next, streak, lastStudyDate, languages)
        return next
      })
    },
    [decks, streak, lastStudyDate, languages, persist]
  )

  const updateCard = useCallback(
    (cardId: string, front: string, back: string, audioFront?: string | null, audioBack?: string | null) => {
      setCards((prev) => {
        const existing = prev.find((c) => c.id === cardId)
        if (existing?.audioFront && audioFront === null) {
          window.api.deleteAudio(existing.audioFront).catch(() => {})
        }
        if (existing?.audioBack && audioBack === null) {
          window.api.deleteAudio(existing.audioBack).catch(() => {})
        }
        const next = prev.map((c) => {
          if (c.id !== cardId) return c
          const updated = { ...c, front, back }
          if (audioFront !== undefined) {
            if (audioFront === null) delete updated.audioFront
            else updated.audioFront = audioFront
          }
          if (audioBack !== undefined) {
            if (audioBack === null) delete updated.audioBack
            else updated.audioBack = audioBack
          }
          return updated
        })
        persist(decks, next, streak, lastStudyDate, languages)
        return next
      })
    },
    [decks, streak, lastStudyDate, languages, persist]
  )

  const deleteCard = useCallback(
    (cardId: string) => {
      setCards((prev) => {
        const card = prev.find((c) => c.id === cardId)
        if (card?.audioFront) window.api.deleteAudio(card.audioFront).catch(() => {})
        if (card?.audioBack) window.api.deleteAudio(card.audioBack).catch(() => {})
        const next = prev.filter((c) => c.id !== cardId)
        persist(decks, next, streak, lastStudyDate, languages)
        return next
      })
    },
    [decks, streak, lastStudyDate, languages, persist]
  )

  const reviewCardFn = useCallback(
    (cardId: string, quality: 0 | 1 | 2 | 3) => {
      setCards((prevCards) => {
        const nextCards = prevCards.map((c) =>
          c.id === cardId ? sm2Review(c, quality) : c
        )

        const { streak: newStreak, lastStudyDate: newLastStudy } = calculateStreak(
          streak,
          lastStudyDate
        )

        setStreak(newStreak)
        setLastStudyDate(newLastStudy)
        persist(decks, nextCards, newStreak, newLastStudy, languages)
        return nextCards
      })
    },
    [decks, streak, lastStudyDate, languages, persist]
  )

  const addLanguage = useCallback(
    (name: string, emoji: string, color: string, defaultTtsVoiceId?: string, defaultTtsVoiceName?: string, defaultTtsModelId?: string) => {
      const language: Language = {
        id: crypto.randomUUID(),
        name,
        emoji,
        color,
        createdAt: Date.now(),
        ...(defaultTtsVoiceId ? { defaultTtsVoiceId, defaultTtsVoiceName, defaultTtsModelId } : {})
      }
      setLanguages((prev) => {
        const next = [...prev, language]
        persist(decks, cards, streak, lastStudyDate, next)
        return next
      })
    },
    [decks, cards, streak, lastStudyDate, persist]
  )

  const updateLanguage = useCallback(
    (languageId: string, updates: Partial<Pick<Language, 'name' | 'emoji' | 'color' | 'defaultTtsVoiceId' | 'defaultTtsVoiceName' | 'defaultTtsModelId'>>) => {
      setLanguages((prev) => {
        const next = prev.map((l) => (l.id === languageId ? { ...l, ...updates } : l))
        persist(decks, cards, streak, lastStudyDate, next)
        return next
      })
    },
    [decks, cards, streak, lastStudyDate, persist]
  )

  const deleteLanguage = useCallback(
    (languageId: string) => {
      setDecks((prevDecks) => {
        const nextDecks = prevDecks.map((d) =>
          d.languageId === languageId ? { ...d, languageId: undefined } : d
        )
        setLanguages((prevLangs) => {
          const nextLangs = prevLangs.filter((l) => l.id !== languageId)
          persist(nextDecks, cards, streak, lastStudyDate, nextLangs)
          return nextLangs
        })
        return nextDecks
      })
    },
    [cards, streak, lastStudyDate, persist]
  )

  const getDueCountForDeck = useCallback(
    (deckId: string) => getDueCards(cards, deckId).length,
    [cards]
  )

  const getCardsForDeck = useCallback(
    (deckId: string) => cards.filter((c) => c.deckId === deckId),
    [cards]
  )

  const dueCount = getAllDueCards(cards).length

  const value: StoreContextType = {
    decks,
    cards,
    languages,
    streak,
    dueCount,
    loaded,
    addDeck,
    deleteDeck,
    updateDeck,
    updateDeckMode,
    addCard,
    updateCard,
    deleteCard,
    reviewCard: reviewCardFn,
    getDueCountForDeck,
    getCardsForDeck,
    addLanguage,
    deleteLanguage,
    updateLanguage
  }

  return React.createElement(StoreContext.Provider, { value }, children)
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
