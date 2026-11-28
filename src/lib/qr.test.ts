import { PNG } from 'pngjs'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { cardQrOptions } from './qr'

describe('QR карты', () => {
  it('читается и совпадает с номером карты', async () => {
    const number = 'ПК-1028'
    const buffer = await QRCode.toBuffer(number, cardQrOptions)
    const image = PNG.sync.read(buffer)
    const decoded = jsQR(Uint8ClampedArray.from(image.data), image.width, image.height)
    expect(decoded?.data).toBe(number)
  })
})
