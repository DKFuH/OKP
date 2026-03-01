import type { Room } from '../../api/projects.js'
import styles from './LeftSidebar.module.css'

interface Props {
  rooms: Room[]
  selectedRoomId: string | null
  onSelectRoom: (id: string) => void
  onAddRoom: () => void
}

export function LeftSidebar({ rooms, selectedRoomId, onSelectRoom, onAddRoom }: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Räume</h3>
        {rooms.length === 0 ? (
          <p className={styles.empty}>Noch kein Raum</p>
        ) : (
          <ul className={styles.list}>
            {rooms.map(r => (
              <li
                key={r.id}
                className={`${styles.item} ${r.id === selectedRoomId ? styles.active : ''}`}
                onClick={() => onSelectRoom(r.id)}
              >
                {r.name}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={styles.addBtn} onClick={onAddRoom}>+ Raum hinzufügen</button>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Katalog</h3>
        <p className={styles.empty}>Sprint 7 – folgt</p>
      </div>
    </aside>
  )
}
