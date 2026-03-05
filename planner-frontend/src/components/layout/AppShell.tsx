import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader.js'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.root}>
      <AppHeader />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
