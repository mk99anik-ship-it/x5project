import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrView({ value, label }: { value: string; label: string }) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#05310A', light: '#F7FBF2' },
    })
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
