import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import liff from '@line/liff'
import './index.css'
import App from './App.jsx'

const liffId = import.meta.env.VITE_LIFF_ID || ''

async function main() {
  if (liffId) {
    await liff.init({ liffId })
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

main()
