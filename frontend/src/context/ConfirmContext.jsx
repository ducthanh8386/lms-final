import React, { createContext, useContext, useState, useCallback } from 'react'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const ConfirmContext = createContext()

export const ConfirmProvider = ({ children }) => {
  const [dialogConfig, setDialogConfig] = useState(null)

  const confirm = useCallback((message, title = "Xác nhận") => {
    return new Promise((resolve) => {
      setDialogConfig({
        title,
        message,
        onConfirm: () => {
          setDialogConfig(null)
          resolve(true)
        },
        onCancel: () => {
          setDialogConfig(null)
          resolve(false)
        }
      })
    })
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogConfig && (
        <ConfirmDialog 
          title={dialogConfig.title} 
          message={dialogConfig.message} 
          onConfirm={dialogConfig.onConfirm} 
          onCancel={dialogConfig.onCancel} 
        />
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  return useContext(ConfirmContext)
}
