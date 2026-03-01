import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './lib/auth'
import { SettingsProvider } from './lib/settingsContext'
import App from './App'
import './index.css'

// IMPORTANT: Replace this with your actual Google Client ID if deploying to production
// We can use a placeholder for now to allow the UI to compile
const GOOGLE_CLIENT_ID = "142869506722-s7mrc8b1li9b1vs1f7dbu83r1ept9okp.apps.googleusercontent.com"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
