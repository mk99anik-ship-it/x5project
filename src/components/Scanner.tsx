import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

export function Scanner({ onCode, onClose }: { onCode: (value: string) => void; onClose: () => void }) {
  const [failed, setFailed] = useState(false)
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    let scanner: { stop: () => Promise<void> } | null = null
    let gone = false
    const run = async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (gone) return
      const instance = new Html5Qrcode('qr-reader', false)
      scanner = instance
      try {
        await instance.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (gone) return
            gone = true
            instance
              .stop()
              .catch(() => undefined)
              .finally(() => onCodeRef.current(text))
          },
          () => undefined,
        )
      } catch {
        if (!gone) setFailed(true)
      }
    }
    void run()
    return () => {
      gone = true
      void scanner?.stop().catch(() => undefined)
    }
  }, [])

  return (
    <Modal title="Сканер QR" onClose={onClose}>
      <div id="qr-reader" className="qr-reader" />
      {failed && (
        <p className="warn" role="alert">
          Камера недоступна. Введите код вручную.
        </p>
      )}
      {!failed && <p className="muted">Наведите на код.</p>}
    </Modal>
  )
}
