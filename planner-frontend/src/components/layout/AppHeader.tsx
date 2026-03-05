import { NavLink, useLocation } from 'react-router-dom'
import styles from './AppHeader.module.css'

function projectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/)
  return match?.[1] ?? null
}

export function AppHeader() {
  const location = useLocation()
  const projectId = projectIdFromPath(location.pathname)

  return (
    <header className={styles.shell}>
      <NavLink to='/' className={styles.brand}>OKP</NavLink>
      <nav className={styles.nav} aria-label='Hauptnavigation'>
        <NavLink to='/' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Projekte</NavLink>
        <NavLink to='/catalog' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Katalog</NavLink>
        <NavLink to='/documents' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Dokumente</NavLink>
        <NavLink to='/contacts' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Kontakte</NavLink>
        <NavLink to='/reports' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Reports</NavLink>
        <NavLink to='/settings' className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Settings</NavLink>
        {projectId && <NavLink to={`/projects/${projectId}`} className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Editor</NavLink>}
        {projectId && <NavLink to={`/projects/${projectId}/presentation`} className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Präsentation</NavLink>}
        {projectId && <NavLink to={`/projects/${projectId}/exports`} className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}>Exporte</NavLink>}
      </nav>
    </header>
  )
}
