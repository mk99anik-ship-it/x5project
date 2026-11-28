import { useEffect, useRef, useState } from 'react'
import { DemoBar } from './components/DemoBar'
import { Modal } from './components/Modal'
import { demoLines } from './data/seed'
import { DEMO_STEPS, type ViewId } from './demo/script'
import { scrollBelowChrome } from './lib/scroll'
import { useStore } from './state/store'
import type { LineInput } from './types'
import type { PaySuccess } from './lib/checkout'
import { Volunteers } from './views/Volunteers'
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
  { id: 'volunteers', label: 'Волонтёрам' },
]

export function App() {
  const { reset, issue, pay } = useStore()
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
  const seenStep = useRef(-1)
  const personRef = useRef<string | null>(null)

  useEffect(() => {
    if (demoIndex !== null) return
    window.scrollTo(0, 0)
  }, [view, demoIndex])

  useEffect(() => {
    document.body.classList.toggle('demo-on', demoIndex !== null)
    return () => document.body.classList.remove('demo-on')
  }, [demoIndex])

  useEffect(() => {
    const header = document.querySelector('.top')
    const apply = () => {
      const headerH = header?.getBoundingClientRect().height ?? 0
      const bar = document.querySelector('.demo-bar')
      const barH = bar?.getBoundingClientRect().height ?? 0
      document.documentElement.style.setProperty('--header-h', `${headerH}px`)
      document.documentElement.style.setProperty('--demo-h', `${barH}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    if (header) observer.observe(header)
    const bar = document.querySelector('.demo-bar')
    if (bar) observer.observe(bar)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [demoIndex])

  useEffect(() => {
    if (demoIndex === null) return
    const step = DEMO_STEPS[demoIndex]
    const timer = window.setTimeout(() => {
      const target =
        step.id === 'issue' && personRef.current
          ? document.getElementById(`person-${personRef.current}`)
          : step.id === 'wallet' || step.id === 'planner'
            ? document.getElementById(step.id === 'planner' ? 'wallet-list' : 'wallet-card')
            : step.id === 'pos' || step.id === 'pay'
              ? document.getElementById('pos-basket')
              : document.querySelector('main h1')
      scrollBelowChrome(target)
    }, 90)
    return () => window.clearTimeout(timer)
  }, [demoIndex, view])

  const openStep = (index: number, run: boolean) => {
    const step = DEMO_STEPS[index]
    if (!step) {
      setDemoIndex(null)
      return
    }
    if (run && index > seenStep.current) {
      if (step.action === 'issue') {
        const person = issue('prog-family')
        if (person) {
          personRef.current = person.id
          setDemoPerson(person.id)
          setWalletId(person.id)
        }
      }
      if ((step.id === 'wallet' || step.action === 'planner') && personRef.current) setWalletId(personRef.current)
      if (step.action === 'planner') setPlannerSeed((value) => value + 1)
      if (step.action === 'basket') {
        setPosPreset(demoLines())
        setPosNonce((value) => value + 1)
        setDemoReceipt(null)
      }
      if (step.action === 'pay' && personRef.current) {
        const result = pay({ code: personRef.current, storeId: 's1', items: demoLines() })
        if (result.ok) setDemoReceipt(result)
      }
      seenStep.current = index
    } else if (step.view === 'wallet' && personRef.current) {
      setWalletId(personRef.current)
    }
    setView(step.view)
    setDemoIndex(index)
  }

  const startDemo = () => {
    seenStep.current = -1
    personRef.current = null
    setDemoPerson(null)
    setDemoReceipt(null)
    openStep(0, true)
  }

  const nextDemo = () => {
    if (demoIndex === null) return
    openStep(demoIndex + 1, true)
  }

  const backDemo = () => {
    if (demoIndex === null || demoIndex === 0) return
    openStep(demoIndex - 1, false)
  }

  const confirmReset = () => {
    reset()
    seenStep.current = -1
    personRef.current = null
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
        <div className="top-row">
          <button type="button" className="logo" onClick={() => setView('landing')}>
            <span className="logo-mark" aria-hidden="true" />
            Тихая касса
          </button>
          <div className="top-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={startDemo}>
              Сценарий
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setResetOpen(true)}>
              Сброс
            </button>
          </div>
        </div>
        <nav className="nav" aria-label="Раздел">
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
      </header>
      <main id="content">
        {view === 'landing' && <Landing onDemo={startDemo} onVolunteers={() => setView('volunteers')} />}
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
        {view === 'reports' && <Reports onVolunteers={() => setView('volunteers')} />}
        {view === 'volunteers' && <Volunteers onBack={() => setView('reports')} />}
      </main>
      {demoIndex !== null && (
        <DemoBar
          step={DEMO_STEPS[demoIndex]}
          index={demoIndex}
          total={DEMO_STEPS.length}
          onBack={backDemo}
          onNext={nextDemo}
          onClose={() => setDemoIndex(null)}
        />
      )}
      {resetOpen && (
        <Modal title="Сбросить данные" onClose={() => setResetOpen(false)}>
          <p>Вернутся исходные карты и покупки, а новые пропадут.</p>
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
