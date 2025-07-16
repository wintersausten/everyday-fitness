import { useState, useCallback } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: ToastMessage['type'], message: string, duration = 5000) => {
    const id = Date.now().toString()
    const newMessage: ToastMessage = { id, type, message, duration }
    
    setMessages(prev => [...prev, newMessage])
    
    // Auto-remove after duration
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id))
    }, duration)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  return {
    messages,
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    warning: (message: string, duration?: number) => addToast('warning', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
    dismissToast
  }
}