import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrandingProvider } from './contexts/BrandingContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <BrandingProvider>
                    <App />
                </BrandingProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
