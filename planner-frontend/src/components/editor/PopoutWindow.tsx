import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  name: string
  onClose: () => void
  children: ReactNode
}

function copyDocumentStyles(source: Document, target: Document) {
  for (const node of Array.from(source.head.children)) {
    if (!(node instanceof HTMLElement)) {
      continue
    }
    if (node.tagName !== 'LINK' && node.tagName !== 'STYLE') {
      continue
    }
    target.head.appendChild(node.cloneNode(true))
  }
}

export function PopoutWindow({ title, name, onClose, children }: Props) {
  const [targetNode, setTargetNode] = useState<HTMLDivElement | null>(null)
  const popupRef = useRef<Window | null>(null)
  const closeHandlerRef = useRef(onClose)
  closeHandlerRef.current = onClose

  const features = useMemo(
    () => 'popup=yes,width=1400,height=900,resizable=yes,scrollbars=no',
    [],
  )

  useEffect(() => {
    const popup = window.open('', name, features)
    if (!popup) {
      onClose()
      return
    }

    popupRef.current = popup
    popup.document.title = title
    copyDocumentStyles(document, popup.document)

    popup.document.body.style.margin = '0'
    popup.document.body.style.height = '100vh'
    popup.document.body.style.overflow = 'hidden'

    const container = popup.document.createElement('div')
    container.style.height = '100vh'
    container.style.display = 'flex'
    popup.document.body.appendChild(container)
    setTargetNode(container)

    const handleBeforeUnload = () => {
      closeHandlerRef.current()
    }

    popup.addEventListener('beforeunload', handleBeforeUnload)
    popup.focus()

    return () => {
      popup.removeEventListener('beforeunload', handleBeforeUnload)
      setTargetNode(null)
      if (!popup.closed) {
        popup.close()
      }
      popupRef.current = null
    }
  }, [features, name, onClose, title])

  useEffect(() => {
    if (!popupRef.current || popupRef.current.closed) {
      return
    }
    popupRef.current.document.title = title
  }, [title])

  if (!targetNode) {
    return null
  }

  return createPortal(children, targetNode)
}
