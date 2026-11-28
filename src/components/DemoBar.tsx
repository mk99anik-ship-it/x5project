import type { DemoStep } from '../demo/script'

export function DemoBar({
  step,
  index,
  total,
  onNext,
  onClose,
}: {
  step: DemoStep
  index: number
  total: number
  onNext: () => void
  onClose: () => void
}) {
  return (
    <div className="demo-bar" role="region" aria-label="Сценарий">
      <div className="demo-bar-copy">
        <p className="kicker">
          {index + 1} из {total}
        </p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
      </div>
      <div className="demo-bar-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Закрыть
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {index === total - 1 ? 'Завершить' : 'Далее'}
        </button>
      </div>
    </div>
  )
}
