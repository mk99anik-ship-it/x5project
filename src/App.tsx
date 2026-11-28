import { useEffect, useState } from 'react'
import { DemoBar } from './components/DemoBar'
import { Modal } from './components/Modal'
import { demoLines } from './data/seed'
import { DEMO_STEPS, type ViewId } from './demo/script'
import { useStore } from './state/store'
import type { LineInput } from './types'
import type { PaySuccess } from './lib/checkout'
import { Donors } from './views/Donors'
import { Fund } from './views/Fund'
import { Landing } from './views/Landing'
import { Pos } from './views/Pos'
import { Reports } from './views/Reports'
import { Wallet } from './views/Wallet'

const NAV: { id: ViewId; label: string }[] = [
  { id: 'landing', label: 'Как это работает' },
  { id: 'fund', label: 'Фонд' },
  { id: 'wallet', label: 'Получатель' },
  { id: 'pos', label: 'Касса' },
  { id: 'reports', label: 'Отчёты' },
  { id: 'donors', label: 'Донорам' },
]

export function App() {
  const { reset, issue, ensureSelfToken, pay } = useStore()
  const [view, setView] = useState<ViewId>('landing')
  const [demoIndex, setDemoIndex] = useState<number | null>(null)
  const [demoPerson, setDemoPerson] = useState<string | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [plannerSeed, setPlannerSeed] = useState(0)
  const [posNonce, setPosNonce] = useState(0)
  const [posPreset, setPosPreset] = useState<LineInput[] | null>(null)
  const [demoReceipt, setDemoReceipt] = useState<PaySuccess | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  useEffect(() => {
    document.body.classList.toggle('demo-on', demoIndex !== null)
    return () => document.body.classList.remove('demo-on')
  }, [demoIndex])

  const startDemo = () => {
    setDemoIndex(0)
    setView('landing')
    setDemoReceipt(null)
  }

  const nextDemo = () => {
    if (demoIndex === null) return
    const upcoming = DEMO_STEPS[demoIndex + 1]
    if (!upcoming) {
      setDemoIndex(null)
      return
    }
    if (upcoming.action === 'issue') {
      const person = issue('prog-family')
      if (person) {
        setDemoPerson(person.id)
        setWalletId(person.id)
      }
    }
    if (upcoming.id === 'wallet' && demoPerson) setWalletId(demoPerson)
    if (upcoming.action === 'planner') {
      if (demoPerson) setWalletId(demoPerson)
      setPlannerSeed((value) => value + 1)
    }
    if (upcoming.action === 'basket') {
      setPosPreset(demoLines())
      setPosNonce((value) => value + 1)
      setDemoReceipt(null)
    }
    if (upcoming.action === 'pay' && demoPerson) {
      const code = ensureSelfToken(demoPerson)
      if (code) {
        const result = pay({ code, storeId: 's1', items: demoLines() })
        if (result.ok) setDemoReceipt(result)
      }
    }
    setView(upcoming.view)
    setDemoIndex(demoIndex + 1)
  }

  const confirmReset = () => {
    reset()
    setEpoch((value) => value + 1)
    setDemoIndex(null)
    setDemoPerson(null)
    setWalletId(null)
    setPlannerSeed(0)
    setPosNonce(0)
    setPosPreset(null)
    setDemoReceipt(null)
    setResetOpen(false)
    setView('landing')
  }

  return (
    <>
      <a className="skip" href="#content">
        К содержанию
      </a>
      <header className="top">
        <button type="button" className="logo" onClick={() => setView('landing')}>
          <span className="logo-mark" aria-hidden="true" />
          Тихая касса
        </button>
        <nav className="nav" aria-label="Роль в демонстрации">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav-btn on' : 'nav-btn'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button type="button" className="btn btn-primary btn-small" onClick={startDemo}>
            Сценарий
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setResetOpen(true)}>
            Сбросить демо
          </button>
        </div>
      </header>
      <main id="content">
        {view === 'landing' && <Landing onDemo={startDemo} onDonors={() => setView('donors')} />}
        {view === 'fund' && (
          <Fund
            highlightId={demoPerson}
            onOpen={(id) => {
              setWalletId(id)
              setView('wallet')
            }}
          />
        )}
        {view === 'wallet' && <Wallet key={epoch} selectedId={walletId} onSelect={setWalletId} plannerSeed={plannerSeed} />}
        {view === 'pos' && <Pos key={epoch} presetNonce={posNonce} preset={posPreset} external={demoReceipt} />}
        {view === 'reports' && <Reports onDonors={() => setView('donors')} />}
        {view === 'donors' && <Donors onBack={() => setView('reports')} />}
      </main>
      {demoIndex !== null && (
        <DemoBar
          step={DEMO_STEPS[demoIndex]}
          index={demoIndex}
          total={DEMO_STEPS.length}
          onNext={nextDemo}
          onClose={() => setDemoIndex(null)}
        />
      )}
      {resetOpen && (
        <Modal title="Сбросить демо" onClose={() => setResetOpen(false)}>
          <p>Вернутся исходные программы, сертификаты и история покупок. То, что вы выпустили и пробили в этой сессии, исчезнет.</p>
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>
              Отмена
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmReset}>
              Сбросить
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
