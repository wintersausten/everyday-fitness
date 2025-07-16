import React from 'react'
import { Navigation } from './Navigation'
import '../App.css'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <div className="app-container">
      <header className="page-header">
        <h1 className="page-title">
          {title || 'Weight Tracker'}
        </h1>
      </header>
      
      <main className="main-content">
        <div className="page-content">
          {children}
        </div>
      </main>
      
      <Navigation />
    </div>
  )
}