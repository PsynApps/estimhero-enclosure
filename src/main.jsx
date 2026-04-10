import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div>
      <h1><a href="https://shop.impudicus.net/" target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'none', borderBottom: '1px solid var(--color-text-secondary)'}}>Estim Hero</a> enclosure pattern designer</h1>
      <App />
    </div>
  </React.StrictMode>,
)
