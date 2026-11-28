import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { accountOf } from '../lib/account'
import { formatFullDate, formatRub } from '../lib/format'
import { scrollBelowChrome } from '../lib/scroll'
import { monthStats } from '../lib/selectors'
import { formatMult, plural } from '../lib/text'
import { useStore } from '../state/store'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  isHardForbidden,
  type Category,
  type Program,
} from '../types'

const BONUS: Category[] = ['vegetables', 'fruits', 'dairy', 'baby', 'fish']

function blankProgram(): Program {
  return {
    id: '',
    name: '',
    description: '',
    monthlyLimit: 6000,
    validityMonths: 6,
    allowed: ['vegetables', 'fruits', 'dairy', 'meat', 'fish', 'bakery', 'grocery', 'baby', 'drinks', 'sweets'],
    forbidden: [],
    caps: [{ category: 'sweets', periodCap: 500 }],
    multipliers: [
      { category: 'vegetables', multiplier: 1.3 },
      { category: 'dairy', multiplier: 1.2 },
      { category: 'baby', multiplier: 1.5 },
    ],
  }
}

function statusOf(status: string, validUntil: number, now: number): { text: string; tone: string } {
  if (status === 'frozen') return { text: 'Заморожена', tone: 'warn' }
  if (status === 'revoked') return { text: 'Отозвана', tone: 'danger' }
  if (validUntil < now) return { text: 'Срок истёк', tone: 'warn' }
  return { text: 'Действует', tone: 'ok' }
}

export function Fund({ highlightId, onOpen }: { highlightId: string | null; onOpen: (id: string) => void }) {
  const { state, saveProgram, issue, topUp, setStatus } = useStore()
  const [query, setQuery] = useState('')
  const [programId, setProgramId] = useState(state.programs[0]?.id ?? '')
  const [draft, setDraft] = useState<Program | null>(null)
  const [formError, setFormError] = useState('')
  const [topupId, setTopupId] = useState<string | null>(null)
  const [topupAmount, setTopupAmount] = useState(1000)
  const [note, setNote] = useState('')
  const now = Date.now()
  const stats = monthStats(state, now)

  useEffect(() => {
    if (!highlightId) return
    const timer = window.setTimeout(() => scrollBelowChrome(document.getElementById(`person-${highlightId}`)), 80)
    return () => window.clearTimeout(timer)
  }, [highlightId])

  const people = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.beneficiaries.filter((person) => {
      const program = state.programs.find((item) => item.id === person.programId)
      const hay = `${person.id} ${program?.name ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [query, state.beneficiaries, state.programs])

  const issueCard = () => {
    const person = issue(programId)
    if (!person) return
    const program = state.programs.find((item) => item.id === programId)
    setNote(
      `Выпущен ${person.id}. Лимит ${formatRub(program?.monthlyLimit ?? 0)}, действует до ${formatFullDate(person.validUntil)}.`,
    )
  }

  const save = () => {
    if (!draft) return
    const saved = saveProgram(draft)
    if (!saved) {
      setFormError('Нужны название, лимит от 500 ₽ и хотя бы одна категория.')
      return
    }
    setDraft(null)
    setFormError('')
    setProgramId(saved.id)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Карты и правила</h1>
        </div>
      </header>

      <section className="budget">
        <div>
          <p className="kicker">Бюджет фонда</p>
          <p className="budget-sum">{formatRub(stats.budget.pool)}</p>
          <p>
            Хватает на {stats.budget.familiesPossible}{' '}
            {plural(stats.budget.familiesPossible, 'семью', 'семьи', 'семей')}. Карт сейчас {stats.activeCount}, свободно ещё{' '}
            {stats.budget.freeSlots}.
          </p>
        </div>
        <dl className="budget-side">
          <div>
            <dt>Лимиты карт</dt>
            <dd>{formatRub(stats.budget.committed)}</dd>
          </div>
          <div>
            <dt>Списано в этом месяце</dt>
            <dd>{formatRub(stats.budget.spent)}</dd>
          </div>
          <div>
            <dt>Остаток бюджета</dt>
            <dd>{formatRub(stats.budget.remaining)}</dd>
          </div>
        </dl>
      </section>

      <section>
        <div className="section-head">
          <h2>Программы</h2>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setFormError('')
              setDraft(blankProgram())
            }}
          >
            Новая программа
          </button>
        </div>
        <div className="program-grid">
          {state.programs.map((program) => (
            <article key={program.id} className="program-card">
              <h3>{program.name}</h3>
              <p>{program.description}</p>
              <p className="program-limit">
                {formatRub(program.monthlyLimit)} <span>в месяц · {program.validityMonths} мес.</span>
              </p>
              <p className="muted">
                Нельзя баллами: {program.forbidden.map((category) => CATEGORY_LABELS[category]).join(', ')}
              </p>
              {program.caps.length > 0 && (
                <p className="muted">
                  Потолок:{' '}
                  {program.caps
                    .map((cap) => `${CATEGORY_LABELS[cap.category]} ${formatRub(cap.periodCap)}`)
                    .join(', ')}
                </p>
              )}
              {program.multipliers.length > 0 && (
                <p className="muted">
                  Коэффициенты:{' '}
                  {program.multipliers
                    .map((item) => `${CATEGORY_LABELS[item.category]} ${formatMult(item.multiplier)}`)
                    .join(', ')}
                </p>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setFormError('')
                  setDraft(program)
                }}
              >
                Изменить
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Карты</h2>
        </div>
        <div className="issue-bar">
          <label>
            Программа
            <select value={programId} onChange={(event) => setProgramId(event.target.value)}>
              {state.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={issueCard}>
            Выпустить карту
          </button>
        </div>
        {(note || highlightId) && (
          <p className="ok" role="status">
            {note || `Выпущена карта ${highlightId}.`}
          </p>
        )}
        <label className="search">
          Найти по номеру или программе
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ПК-1008" />
        </label>
        <div className="person-list">
          {people.map((person) => {
            const program = state.programs.find((item) => item.id === person.programId)
            const balance = program ? formatRub(accountOf(person, program, state.transactions, now).balance) : '—'
            return (
              <PersonCard
                key={person.id}
                id={person.id}
                marked={person.id === highlightId}
                programName={program?.name ?? 'Программа удалена'}
                status={statusOf(person.status, person.validUntil, now)}
                balanceLabel={balance}
                until={formatFullDate(person.validUntil)}
                onOpen={() => onOpen(person.id)}
                onTopup={() => {
                  setTopupAmount(1000)
                  setTopupId(person.id)
                }}
                onFreeze={() => setStatus(person.id, person.status === 'frozen' ? 'active' : 'frozen')}
                freezeLabel={person.status === 'frozen' ? 'Разморозить' : 'Заморозить'}
                onRevoke={() => setStatus(person.id, person.status === 'revoked' ? 'active' : 'revoked')}
                revokeLabel={person.status === 'revoked' ? 'Восстановить' : 'Отозвать'}
                revokeDanger={person.status !== 'revoked'}
              />
            )
          })}
          {people.length === 0 && <p className="muted">Ничего не найдено.</p>}
        </div>
      </section>

      {draft && (
        <Modal title={draft.id ? 'Программа' : 'Новая программа'} onClose={() => setDraft(null)}>
          <div className="form">
            <label>
              Название
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <label>
              Описание
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                Лимит в месяц, ₽
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={draft.monthlyLimit}
                  onChange={(event) => setDraft({ ...draft, monthlyLimit: Number(event.target.value) })}
                />
              </label>
              <label>
                Срок, месяцев
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={draft.validityMonths}
                  onChange={(event) => setDraft({ ...draft, validityMonths: Number(event.target.value) })}
                />
              </label>
            </div>
            <fieldset>
              <legend>Что можно оплатить баллами</legend>
              <div className="chips">
                {CATEGORIES.map((category) => {
                  const locked = isHardForbidden(category)
                  const on = !locked && draft.allowed.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      aria-pressed={on}
                      disabled={locked}
                      onClick={() => toggleCategory(draft, category, setDraft)}
                    >
                      {CATEGORY_LABELS[category]}
                      {locked ? ' · нельзя' : ''}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend>Списание баллов</legend>
              <div className="form-row">
                {BONUS.map((category) => (
                  <label key={category}>
                    {CATEGORY_LABELS[category]}
                    <input
                      inputMode="decimal"
                      value={draft.multipliers.find((item) => item.category === category)?.multiplier ?? ''}
                      onChange={(event) => setMultiplier(draft, category, event.target.value, setDraft)}
                      disabled={!draft.allowed.includes(category)}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Потолок категории в месяц</legend>
              {draft.caps.map((cap, index) => (
                <div className="form-row" key={`${cap.category}-${index}`}>
                  <label>
                    Категория
                    <select
                      value={cap.category}
                      onChange={(event) => {
                        const category = event.target.value as Category
                        setDraft({
                          ...draft,
                          caps: draft.caps.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, category } : item,
                          ),
                        })
                      }}
                    >
                      {draft.allowed.map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Лимит, ₽
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={cap.periodCap}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          caps: draft.caps.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, periodCap: Number(event.target.value) } : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => setDraft({ ...draft, caps: draft.caps.filter((_, itemIndex) => itemIndex !== index) })}
                  >
                    Убрать
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  const category = draft.allowed.find((item) => !draft.caps.some((cap) => cap.category === item))
                  if (!category) return
                  setDraft({ ...draft, caps: [...draft.caps, { category, periodCap: 500 }] })
                }}
              >
                Добавить потолок
              </button>
            </fieldset>
            {formError && (
              <p className="warn" role="alert">
                {formError}
              </p>
            )}
            <button type="button" className="btn btn-primary" onClick={save}>
              Сохранить программу
            </button>
          </div>
        </Modal>
      )}

      {topupId && (
        <Modal title={`Пополнить ${topupId}`} onClose={() => setTopupId(null)}>
          <div className="form">
            <label>
              Сумма, ₽
              <input
                type="number"
                min={100}
                step={100}
                value={topupAmount}
                onChange={(event) => setTopupAmount(Number(event.target.value))}
              />
            </label>
            <div className="chips">
              {[500, 1000, 2000].map((amount) => (
                <button key={amount} type="button" className="chip" onClick={() => setTopupAmount(amount)}>
                  {formatRub(amount)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                topUp(topupId, topupAmount)
                setTopupId(null)
              }}
            >
              Пополнить
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function PersonCard({
  id,
  marked,
  programName,
  status,
  balanceLabel,
  until,
  onOpen,
  onTopup,
  onFreeze,
  freezeLabel,
  onRevoke,
  revokeLabel,
  revokeDanger,
}: {
  id: string
  marked: boolean
  programName: string
  status: { text: string; tone: string }
  balanceLabel: string
  until: string
  onOpen: () => void
  onTopup: () => void
  onFreeze: () => void
  freezeLabel: string
  onRevoke: () => void
  revokeLabel: string
  revokeDanger: boolean
}) {
  return (
    <article id={`person-${id}`} className={marked ? 'person mark' : 'person'}>
      <div>
        <h3>{id}</h3>
        <p className="muted">{programName}</p>
      </div>
      <p className={`badge badge-${status.tone}`}>{status.text}</p>
      <p className="pair">
        <span className="muted">Остаток</span>
        <strong>{balanceLabel}</strong>
      </p>
      <p className="muted">до {until}</p>
      <div className="person-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={onOpen}>
          Открыть карту
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onTopup}>
          Пополнить
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onFreeze}>
          {freezeLabel}
        </button>
        <button type="button" className={revokeDanger ? 'btn btn-danger btn-small' : 'btn btn-ghost btn-small'} onClick={onRevoke}>
          {revokeLabel}
        </button>
      </div>
    </article>
  )
}

function toggleCategory(draft: Program, category: Category, setDraft: (program: Program) => void) {
  if (isHardForbidden(category)) return
  const has = draft.allowed.includes(category)
  const allowed = has ? draft.allowed.filter((item) => item !== category) : [...draft.allowed, category]
  setDraft({
    ...draft,
    allowed,
    caps: draft.caps.filter((cap) => allowed.includes(cap.category)),
    multipliers: draft.multipliers.filter((item) => allowed.includes(item.category)),
  })
}

function setMultiplier(draft: Program, category: Category, raw: string, setDraft: (program: Program) => void) {
  const value = Number(raw.replace(',', '.'))
  const rest = draft.multipliers.filter((item) => item.category !== category)
  if (!raw.trim() || !Number.isFinite(value) || value <= 1) {
    setDraft({ ...draft, multipliers: rest })
    return
  }
  setDraft({ ...draft, multipliers: [...rest, { category, multiplier: Math.min(3, Math.round(value * 10) / 10) }] })
}
