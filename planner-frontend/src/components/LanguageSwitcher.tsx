import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languagePacksApi } from '../api/languagePacks.js'
import { hydrateLocaleMessages } from '../i18n/index.js'
import { SUPPORTED_LOCALES } from '../i18n/resolveLocale.js'
import styles from './LanguageSwitcher.module.css'

const LOCALE_LABELS: Record<string, string> = {
  de: 'DE',
  en: 'EN',
}

interface Props {
  /** Optional callback after language change */
  onChange?: (locale: string) => void
}

/**
 * Language switcher showing only active (non-planned) locales: DE and EN.
 * Updates i18next, localStorage (okp_locale), document.documentElement.lang,
 * and fires-and-forgets a PUT /api/v1/tenant/locale-settings.
 */
export function LanguageSwitcher({ onChange }: Props) {
  const { i18n } = useTranslation()
  const current = i18n.language
  const [packLocales, setPackLocales] = useState<string[]>([])

  useEffect(() => {
    void languagePacksApi.list({ enabled: true })
      .then((items) => {
        const locales = items
          .map((item) => item.locale_code.trim().toLowerCase())
          .filter((code) => code.length > 0)
        setPackLocales([...new Set(locales)])
      })
      .catch(() => {
        setPackLocales([])
      })
  }, [])

  const availableLocales = useMemo(
    () => [...new Set([...SUPPORTED_LOCALES, ...packLocales])].sort((left, right) => left.localeCompare(right)),
    [packLocales],
  )

  async function handleSwitch(code: string) {
    if (code === current) return

    await hydrateLocaleMessages(code)
    await i18n.changeLanguage(code)

    try {
      localStorage.setItem('okp_locale', code)
    } catch {
      // Storage blocked – skip
    }

    try {
      document.documentElement.lang = code
    } catch {
      // Non-browser – skip
    }

    // Non-blocking backend sync
    void fetch('/api/v1/tenant/locale-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_locale: code }),
    }).catch(() => {
      // Ignore network errors; locale is already applied locally
    })

    onChange?.(code)
  }

  return (
    <div className={styles.switcher} data-testid='language-switcher'>
      {availableLocales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => void handleSwitch(code)}
          className={`${styles.button} ${current === code ? styles.buttonActive : ''}`}
          data-testid={`language-switch-${code}`}
        >
          {LOCALE_LABELS[code] ?? code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
