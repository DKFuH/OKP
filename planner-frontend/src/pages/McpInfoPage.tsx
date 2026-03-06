import { useEffect, useState } from 'react'
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
  Spinner,
  Title2,
  Subtitle2,
  makeStyles,
  tokens,
} from '@fluentui/react-components'

interface McpCapabilities {
  tools: boolean
  read_tools?: string[]
  write_tools?: string[]
}

interface McpInfo {
  name: string
  version: string
  description: string
  protocol: string
  capabilities: McpCapabilities
}

const MCP_ENDPOINT = '/api/v1/mcp'

const useStyles = makeStyles({
  page: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'grid',
    rowGap: tokens.spacingVerticalXXL,
  },
  header: {
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  endpointRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    flexWrap: 'wrap',
  },
  endpointUrl: {
    flex: '1 1 auto',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    alignItems: 'baseline',
  },
  toolColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: tokens.spacingVerticalM,
  },
  toolList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  steps: {
    paddingInlineStart: tokens.spacingHorizontalXL,
    display: 'grid',
    rowGap: tokens.spacingVerticalS,
  },
  codeSnippet: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    fontFamily: 'monospace',
    fontSize: '13px',
  },
})

export function McpInfoPage() {
  const styles = useStyles()
  const [info, setInfo] = useState<McpInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(MCP_ENDPOINT)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        setInfo((await response.json()) as McpInfo)
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'MCP-Info konnte nicht geladen werden')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function handleCopy() {
    const url = `${window.location.origin}${MCP_ENDPOINT}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title2>MCP: Claude als Planungsassistent</Title2>
        <Subtitle2>Verbinde Claude oder andere KI-Systeme als vollwertigen Planungsassistenten.</Subtitle2>
      </div>

      <Card>
        <CardHeader header={<Body1Strong>MCP-Endpunkt</Body1Strong>} />
        <div className={styles.endpointRow}>
          <span className={styles.endpointUrl}>
            {window.location.origin}{MCP_ENDPOINT}
          </span>
          <Button appearance='primary' size='small' onClick={handleCopy}>
            {copied ? 'Kopiert' : 'URL kopieren'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader header={<Body1Strong>Server-Info</Body1Strong>} />
        {loading && <Spinner label='Lade MCP-Info\u2026' size='small' />}
        {error && (
          <MessageBar intent='error'>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        {info && (
          <div className={styles.metaGrid}>
            <Caption1>Name</Caption1>
            <Body1>{info.name}</Body1>
            <Caption1>Version</Caption1>
            <Body1>{info.version}</Body1>
            <Caption1>Protokoll</Caption1>
            <Body1>{info.protocol}</Body1>
          </div>
        )}
      </Card>

      {info && (
        <Card>
          <CardHeader header={<Body1Strong>Verf\u00fcgbare Tools</Body1Strong>} />
          <div className={styles.toolColumns}>
            {info.capabilities.read_tools && (
              <div>
                <Body1Strong>Read-Tools</Body1Strong>
                {' '}
                <Badge appearance='tint'>{info.capabilities.read_tools.length}</Badge>
                <ul className={styles.toolList} style={{ marginTop: '8px' }}>
                  {info.capabilities.read_tools.map((tool) => (
                    <li key={tool}>
                      <Caption1 className={styles.codeSnippet}>{tool}</Caption1>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {info.capabilities.write_tools && (
              <div>
                <Body1Strong>Write-Tools</Body1Strong>
                {' '}
                <Badge appearance='tint'>{info.capabilities.write_tools.length}</Badge>
                <ul className={styles.toolList} style={{ marginTop: '8px' }}>
                  {info.capabilities.write_tools.map((tool) => (
                    <li key={tool}>
                      <Caption1 className={styles.codeSnippet}>{tool}</Caption1>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader header={<Body1Strong>Schnellstart</Body1Strong>} />
        <ol className={styles.steps}>
          <li><Body1>\u00d6ffne Claude Desktop und gehe zu Einstellungen \u2192 MCP-Server.</Body1></li>
          <li><Body1>Lege einen neuen HTTP/SSE-Server an.</Body1></li>
          <li>
            <Body1>Trage als URL ein: </Body1>
            <code className={styles.codeSnippet}>{window.location.origin}{MCP_ENDPOINT}</code>
          </li>
          <li><Body1>Verbinde den Server, damit Claude die verf\u00fcgbaren Tools laden kann.</Body1></li>
          <li>
            <Body1>Beispiel: <em>Zeig mir die R\u00e4ume aus Projekt X und schlage ein Layout vor.</em></Body1>
          </li>
        </ol>
      </Card>
    </div>
  )
}
