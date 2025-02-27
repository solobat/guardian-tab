import React from 'react'
import { createRoot } from 'react-dom/client'
import { NewTab } from './NewTab'
import './NewTab.css'

const init = async () => {
  
  const container = document.getElementById('app')
  if (container) {
    const root = createRoot(container)
    root.render(
      <React.StrictMode>
        <NewTab />
      </React.StrictMode>
    )
  }
}

init()
