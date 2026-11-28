import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cardQrOptions } from '../lib/qr'

export function QrView({ value, label }: { value: string; label: string }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, cardQrOptions)
      .then((data) => {
        if (live) setUrl(data)
      })
      .catch(() => {
        if (live) setUrl('')
      })
    return () => {
      live = false
    }
  }, [value])

  if (!url) return <div className="qr-plate qr-empty" aria-hidden="true" />
  return (
    <div className="qr-plate">
      <img src={url} alt={label} width={220} height={220} />
    </div>
  )
}
