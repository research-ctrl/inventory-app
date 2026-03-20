'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Operator } from '@/lib/operator'

const STORAGE_KEY = 'smls_operator'

export function useOperator() {
  const [operator, setOperatorState] = useState<Operator | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setOperatorState(JSON.parse(stored))
    } catch {
      // Ignore parse errors — treat as no operator stored
    }
    setLoading(false)
  }, [])

  const setOperator = useCallback((op: Operator) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(op))
    setOperatorState(op)
  }, [])

  const clearOperator = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOperatorState(null)
  }, [])

  return { operator, setOperator, clearOperator, loading }
}
