import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ConfirmDialogHost from './components/common/ConfirmDialogHost.jsx'
import ThemedToaster from './components/common/ThemedToaster.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
        <ThemedToaster />
        <ConfirmDialogHost />
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  </StrictMode>,
)
