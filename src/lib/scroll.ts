export function scrollBelowChrome(target: Element | null) {
  if (!target) return
  const header = document.querySelector('.top')
  const bar = document.querySelector('.demo-bar')
  const headerH = header?.getBoundingClientRect().height ?? 0
  const barH = bar?.getBoundingClientRect().height ?? 0
  const gap = 12
  const rect = target.getBoundingClientRect()
  const topLimit = headerH + gap
  const bottomLimit = window.innerHeight - barH - gap
  if (rect.top >= topLimit && rect.bottom <= bottomLimit) return
  const next = window.scrollY + rect.top - topLimit
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  window.scrollTo(0, Math.max(0, next))
  root.style.scrollBehavior = previous
}
