import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import { useState } from 'react'

function Root() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("ams_auth"));
  return authed ? <App /> : <Login onLogin={() => setAuthed(true)} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
