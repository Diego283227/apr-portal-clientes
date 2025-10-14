import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import { SocketProvider } from './contexts/SocketContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <App />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          theme="light"
        />
      </SocketProvider>
    </QueryClientProvider>
  </StrictMode>,
)
