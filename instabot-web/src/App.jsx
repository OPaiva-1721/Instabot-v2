import { Routes, Route, NavLink } from 'react-router-dom'
import Queue from './pages/Queue.jsx'
import WhatsApp from './pages/WhatsApp.jsx'
import Canais from './pages/Canais.jsx'
import Nichos from './pages/Nichos.jsx'
import Settings from './pages/Settings.jsx'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo">
          <span className="nav-logo-dot" />
          INSTABOT
        </div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Fila
          </NavLink>
          <NavLink to="/nichos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Nichos
          </NavLink>
          <NavLink to="/canais" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Canais
          </NavLink>
          <NavLink to="/whatsapp" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            WhatsApp
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Config
          </NavLink>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/nichos" element={<Nichos />} />
          <Route path="/canais" element={<Canais />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
