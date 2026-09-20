import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="17269757270-gk04h1b82ljnu5ep0fdnctn7gru3aca1.apps.googleusercontent.com">
      
      <App />
      
    </GoogleOAuthProvider>
  </StrictMode>,
)