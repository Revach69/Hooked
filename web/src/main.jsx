import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initSentry } from './lib/sentryConfig.js'

// Initialize Sentry before rendering the app
initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 