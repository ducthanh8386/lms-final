import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const cartKey = user ? `cart_${user.id}` : 'cart_guest'

  const [cart, setCart] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(cartKey)
    setCart(saved ? JSON.parse(saved) : [])
    setLoadedKey(cartKey)
  }, [cartKey])

  useEffect(() => {
    if (loadedKey === cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(cart))
    }
  }, [cart, cartKey, loadedKey])

  const addToCart = useCallback((course) => {
    setCart((prev) => {
      if (prev.find((item) => item.id === course.id)) return prev
      return [...prev, course]
    })
  }, [])

  const removeFromCart = useCallback((courseId) => {
    setCart((prev) => prev.filter((item) => item.id !== courseId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const value = useMemo(
    () => ({
      cart,
      setCart,
      addToCart,
      removeFromCart,
      clearCart,
      totalCount: cart.length,
      totalPrice: cart.reduce((sum, item) => sum + (item.is_free ? 0 : Number(item.price)), 0),
    }),
    [cart, addToCart, removeFromCart, clearCart]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
