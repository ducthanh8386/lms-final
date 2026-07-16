import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'

// 1. Reset trước tiên — đặt nền tảng
import './styles/reset.css'
// 2. Variables — định nghĩa design tokens (màu, spacing, font, etc.)
import './styles/variables.css'
// 3. Base & Utilities (TailwindCSS)
import './index.css'
// 4. Layout & Responsive Grid
import './styles/layout.css'
// 5. Animations & Micro-interactions
import './styles/animations.css'
// 6. Component-level styles
import './styles/components.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
