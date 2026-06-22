import React, { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

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
