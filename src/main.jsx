import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import GlobalErrorBoundary from './components/Layout/GlobalErrorBoundary'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary 
      FallbackComponent={GlobalErrorBoundary}
      onReset={() => window.location.reload()}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1c1e', // surface-container-lowest
              color: '#e3e2e6', // on-surface
              borderRadius: '12px',
              border: '1px solid rgba(142, 144, 153, 0.2)', // outline variant
            },
            success: {
              iconTheme: {
                primary: '#90dca4', // secondary
                secondary: '#1a1c1e',
              },
            },
            error: {
              iconTheme: {
                primary: '#ffb4ab', // error
                secondary: '#1a1c1e',
              },
            },
          }} 
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
