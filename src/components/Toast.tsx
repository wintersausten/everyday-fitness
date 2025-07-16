import React, { useEffect, useState } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

interface ToastProps {
  message: ToastMessage
  onDismiss: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onDismiss(message.id), 300) // Wait for animation
    }, message.duration || 5000)
    
    return () => clearTimeout(timer)
  }, [message.id, message.duration, onDismiss])
  
  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }
  
  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  }
  
  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }
  
  return (
    <div
      className={`max-w-sm w-full border rounded-lg p-4 shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${colors[message.type]}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${iconColors[message.type]}`}>
          {icons[message.type]}
        </div>
        <div className="ml-3 flex-1">
          {message.title && (
            <p className="text-sm font-medium">{message.title}</p>
          )}
          <p className={`text-sm ${message.title ? 'mt-1' : ''}`}>
            {message.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onDismiss(message.id)}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  messages: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

