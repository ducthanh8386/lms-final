import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { paymentService } from '../services/paymentService'

const PendingPaymentContext = createContext(null)

function mapSession(row) {
  if (!row) return null
  return {
    paymentCode: row.payment_code || row.paymentCode,
    qrUrl: row.qr_url || row.qrUrl,
    amount: Number(row.amount || 0),
    expiresAt: row.expires_at || row.expiresAt,
    status: row.status || 'pending',
    orderIds: row.order_ids || row.orderIds || [],
  }
}

export const PendingPaymentProvider = ({ children }) => {
  const { user } = useAuth()
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearPending = useCallback(() => {
    setPending(null)
    paymentService.clearRememberedPaymentCode()
  }, [])

  const setPendingFromSession = useCallback((sessionLike) => {
    const mapped = mapSession(sessionLike)
    if (!mapped?.paymentCode) {
      clearPending()
      return
    }
    if (mapped.status && mapped.status !== 'pending') {
      clearPending()
      return
    }
    if (mapped.expiresAt && new Date(mapped.expiresAt).getTime() <= Date.now()) {
      clearPending()
      return
    }
    setPending(mapped)
    paymentService.rememberPaymentCode(mapped.paymentCode)
  }, [clearPending])

  const refreshPending = useCallback(async () => {
    if (!user) {
      clearPending()
      return null
    }
    setLoading(true)
    try {
      const { data } = await paymentService.getActivePendingSession()
      if (data) {
        const mapped = mapSession(data)
        setPending(mapped)
        paymentService.rememberPaymentCode(mapped.paymentCode)
        return mapped
      }

      // Fallback: mã đã nhớ (sau reload) — sync để cập nhật hết hạn / đã trả
      const remembered = paymentService.getRememberedPaymentCode()
      if (remembered) {
        const { data: synced } = await paymentService.syncPayment(remembered)
        if (synced?.status === 'pending' && synced.expiresAt && new Date(synced.expiresAt) > Date.now()) {
          const mapped = {
            paymentCode: synced.paymentCode || remembered,
            qrUrl: synced.qrUrl,
            amount: Number(synced.amount || 0),
            expiresAt: synced.expiresAt,
            status: 'pending',
            orderIds: synced.orderIds || [],
          }
          setPending(mapped)
          paymentService.rememberPaymentCode(mapped.paymentCode)
          return mapped
        }
      }

      clearPending()
      return null
    } finally {
      setLoading(false)
    }
  }, [user, clearPending])

  useEffect(() => {
    refreshPending()
  }, [refreshPending])

  // Cập nhật đếm ngược hết hạn cục bộ
  useEffect(() => {
    if (!pending?.expiresAt) return
    const ms = new Date(pending.expiresAt).getTime() - Date.now()
    if (ms <= 0) {
      clearPending()
      return
    }
    const t = setTimeout(() => {
      refreshPending()
    }, ms + 500)
    return () => clearTimeout(t)
  }, [pending?.expiresAt, pending?.paymentCode, clearPending, refreshPending])

  const value = useMemo(
    () => ({
      pending,
      loading,
      hasPendingPayment: Boolean(pending?.paymentCode),
      refreshPending,
      setPendingFromSession,
      clearPending,
    }),
    [pending, loading, refreshPending, setPendingFromSession, clearPending]
  )

  return (
    <PendingPaymentContext.Provider value={value}>{children}</PendingPaymentContext.Provider>
  )
}

export const usePendingPayment = () => {
  const ctx = useContext(PendingPaymentContext)
  if (!ctx) {
    return {
      pending: null,
      loading: false,
      hasPendingPayment: false,
      refreshPending: async () => null,
      setPendingFromSession: () => {},
      clearPending: () => {},
    }
  }
  return ctx
}
