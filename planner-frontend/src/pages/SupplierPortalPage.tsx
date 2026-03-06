import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Card,
  CardHeader,
  MessageBar,
  MessageBarBody,
  Option,
  Select,
  Spinner,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  supplierPortalApi,
  type SupplierErpConnector,
  type SupplierPortalOrder,
  type SupplierPortalOrderStatus,
} from '../api/supplierPortal.js'

const STATUS_LABELS: Record<SupplierPortalOrderStatus, string> = {
  draft: 'Entwurf', sent: 'Gesendet', confirmed: 'Best\u00e4tigt',
  partially_delivered: 'Teilgeliefert', delivered: 'Geliefert', cancelled: 'Storniert',
}
const OPEN_STATUSES: SupplierPortalOrderStatus[] = ['draft', 'sent', 'confirmed']
type StatusFilter = 'all' | SupplierPortalOrderStatus

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const useStyles = makeStyles({
  page: { display: 'grid', rowGap: tokens.spacingVerticalXXL },
  toolbar: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'flex-end' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`, backgroundColor: tokens.colorNeutralBackground3, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, whiteSpace: 'nowrap' },
  td: { padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
})

export function SupplierPortalPage() {
  const styles = useStyles()
  const [orders, setOrders] = useState<SupplierPortalOrder[]>([])
  const [connectors, setConnectors] = useState<SupplierErpConnector[]>([])
  const [selectedConnectorByOrder, setSelectedConnectorByOrder] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [pushingOrderId, setPushingOrderId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    Promise.all([supplierPortalApi.listOpenOrders(), supplierPortalApi.listConnectors()])
      .then(([orderData, connectorData]) => {
        setOrders(orderData)
        setConnectors(connectorData.filter((c) => c.enabled))
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredOrders = useMemo(() => (
    statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)
  ), [orders, statusFilter])

  async function handlePushToErp(order: SupplierPortalOrder) {
    const connectorId = selectedConnectorByOrder[order.id]
    if (!connectorId) { setError('Bitte zuerst einen ERP-Konnektor ausw\u00e4hlen.'); return }
    setPushingOrderId(order.id); setError(null); setMessage(null)
    try {
      const result = await supplierPortalApi.pushToErp(order.id, connectorId)
      if (!result.success) throw new Error(result.error ?? 'ERP-\u00dcbertragung fehlgeschlagen')
      setMessage(`Bestellung ${order.id} wurde ans ERP \u00fcbertragen${result.erp_order_ref ? ` (Ref: ${result.erp_order_ref})` : ''}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ERP-\u00dcbertragung fehlgeschlagen')
    } finally { setPushingOrderId(null) }
  }

  return (
    <div className={styles.page}>
      <Title2>Lieferantenportal</Title2>

      <div className={styles.toolbar}>
        <Select
          aria-label='Statusfilter'
          value={statusFilter}
          onChange={(_e, d) => setStatusFilter(d.value as StatusFilter)}
        >
          <Option value='all'>Alle offenen</Option>
          {OPEN_STATUSES.map((status) => <Option key={status} value={status}>{STATUS_LABELS[status]}</Option>)}
        </Select>
      </div>

      {loading && <Spinner label='Lade\u2026' />}
      {error && <MessageBar intent='error'><MessageBarBody>{error}</MessageBarBody></MessageBar>}
      {message && <MessageBar intent='success'><MessageBarBody>{message}</MessageBarBody></MessageBar>}
      {!loading && filteredOrders.length === 0 && <Body1>Keine offenen Bestellungen gefunden.</Body1>}

      {!loading && filteredOrders.length > 0 && (
        <Card>
          <CardHeader
            header={<Body1Strong>Bestellungen</Body1Strong>}
            action={<Badge appearance='tint'>{filteredOrders.length}</Badge>}
          />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['Lieferant', 'Referenz', 'Positionen', 'Status', 'Erstellt', 'ERP-Konnektor', 'Aktion'].map((h) => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.td}><Body1>{order.supplier_name}</Body1></td>
                    <td className={styles.td}><Caption1>{order.supplier_ref ?? '\u2013'}</Caption1></td>
                    <td className={styles.td}><Caption1>{order.items.length}</Caption1></td>
                    <td className={styles.td}><Badge appearance='outline'>{STATUS_LABELS[order.status]}</Badge></td>
                    <td className={styles.td}><Caption1>{formatDate(order.created_at)}</Caption1></td>
                    <td className={styles.td}>
                      <Select
                        aria-label={`ERP-Konnektor f\u00fcr ${order.id}`}
                        value={selectedConnectorByOrder[order.id] ?? ''}
                        onChange={(_e, d) => setSelectedConnectorByOrder((prev) => ({ ...prev, [order.id]: d.value }))}
                      >
                        <Option value=''>Konnektor w\u00e4hlen \u2026</Option>
                        {connectors.map((c) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                      </Select>
                    </td>
                    <td className={styles.td}>
                      <Button
                        appearance='primary'
                        size='small'
                        disabled={pushingOrderId === order.id || !selectedConnectorByOrder[order.id]}
                        onClick={() => void handlePushToErp(order)}
                      >
                        {pushingOrderId === order.id ? <Spinner size='tiny' /> : 'ERP-Push'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
