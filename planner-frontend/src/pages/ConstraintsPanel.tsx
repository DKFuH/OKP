import { useCallback, useEffect, useState } from 'react'
import {
  createRoomConstraint,
  deleteConstraint,
  getRoomConstraints,
  solveRoomConstraints,
  type ConstraintType,
  type GeometryConstraint,
} from '../api/constraints.js'
import styles from './ConstraintsPanel.module.css'

type Props = {
  roomId: string
}

const CONSTRAINT_TYPES: ConstraintType[] = [
  'horizontal',
  'vertical',
  'parallel',
  'perpendicular',
  'coincident',
  'equal_length',
  'symmetry_axis',
  'driving_dimension',
]

export function ConstraintsPanel({ roomId }: Props) {
  const [items, setItems] = useState<GeometryConstraint[]>([])
  const [type, setType] = useState<ConstraintType>('horizontal')
  const [targetRefsText, setTargetRefsText] = useState('')
  const [valueJsonText, setValueJsonText] = useState('{}')
  const [persistSolve, setPersistSolve] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const constraints = await getRoomConstraints(roomId)
      setItems(constraints)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Constraint loading failed')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreateConstraint() {
    setError(null)
    try {
      const target_refs = targetRefsText
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)

      if (target_refs.length === 0) {
        setError('At least one target reference is required.')
        return
      }

      const value_json = JSON.parse(valueJsonText) as Record<string, unknown>
      await createRoomConstraint(roomId, { type, target_refs, value_json, enabled: true })

      setTargetRefsText('')
      setValueJsonText('{}')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Constraint creation failed')
    }
  }

  async function onDeleteConstraint(id: string) {
    setError(null)
    try {
      await deleteConstraint(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Constraint deletion failed')
    }
  }

  async function onSolve() {
    setError(null)
    setWarnings([])
    try {
      const result = await solveRoomConstraints(roomId, persistSolve)
      setWarnings(result.warnings)
      if (persistSolve) {
        await load()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Constraint solve failed')
    }
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>Constraints</h3>

      <div className={styles.formGrid}>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value as ConstraintType)}>
            {CONSTRAINT_TYPES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>

        <label>
          Target refs (comma separated)
          <input
            value={targetRefsText}
            onChange={(event) => setTargetRefsText(event.target.value)}
            placeholder='w1,w2 or p1,w1'
          />
        </label>

        <label>
          Value JSON
          <textarea
            value={valueJsonText}
            onChange={(event) => setValueJsonText(event.target.value)}
            rows={3}
          />
        </label>

        <button type='button' onClick={() => void onCreateConstraint()} disabled={loading}>
          Add constraint
        </button>
      </div>

      <div className={styles.solveSection}>
        <label className={styles.persistLabel}>
          <input
            type='checkbox'
            checked={persistSolve}
            onChange={(event) => setPersistSolve(event.target.checked)}
          />
          Persist solver result to room
        </label>
        <button type='button' onClick={() => void onSolve()} disabled={loading}>
          Solve constraints
        </button>
      </div>

      {error && <p>{error}</p>}
      {warnings.length > 0 && (
        <ul>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className={styles.listSection}>
        <strong>Active constraints ({items.length})</strong>
        {items.length === 0 ? (
          <p className={styles.empty}>No constraints defined.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                {item.type} [{item.target_refs.join(', ')}]
                <button
                  type='button'
                  onClick={() => void onDeleteConstraint(item.id)}
                  className={styles.deleteButton}
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
