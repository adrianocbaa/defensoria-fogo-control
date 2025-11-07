import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './index.css'

// Unregister any existing Service Workers to avoid stale caches in normal tabs
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      console.info('[App] Unregistering old service workers:', registrations.length)
      registrations.forEach((registration) => registration.unregister())
    }
  }).catch((err) => console.warn('[App] SW check failed:', err))
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
