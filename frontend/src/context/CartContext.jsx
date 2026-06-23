import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const cartKey = user ? `cart_${user.id}` : 'cart_guest'

  const [cart, setCart] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)

  // Load cart when cartKey changes
  useEffect(() => {
    const saved = localStorage.getItem(cartKey)
    setCart(saved ? JSON.parse(saved) : [])
    setLoadedKey(cartKey)
  }, [cartKey])

  // Save cart to the active key whenever it changes, but only if it matches the loaded key
  useEffect(() => {
    if (loadedKey === cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(cart))
    }
  }, [cart, cartKey, loadedKey])

  const addToCart = (course) => {
    setCart(prev => {
      if (prev.find(item => item.id === course.id)) return prev
      return [...prev, course]
    })
  }

  const removeFromCart = (courseId) => {
    setCart(prev => prev.filter(item => item.id !== courseId))
  }

  const clearCart = () => {
    setCart([])
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    totalCount: cart.length,
    totalPrice: cart.reduce((sum, item) => sum + (item.is_free ? 0 : Number(item.price)), 0)
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
