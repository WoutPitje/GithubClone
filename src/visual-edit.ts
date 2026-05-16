// Iframe ↔ parent bridge for "click to select" visual editing. The Locable
// control plane (parent window) toggles select mode via postMessage; this
// script overlays a hover indicator inside the dev preview and sends the
// clicked element's info back to the parent.
//
// No-op outside an iframe (so the production deploy isn't affected).

if (typeof window !== 'undefined' && window.parent !== window) {
  let active = false

  const overlay = document.createElement('div')
  overlay.setAttribute('data-visual-edit-overlay', '1')
  overlay.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'border:2px solid oklch(0.7 0.18 250)',
    'background:oklch(0.7 0.18 250 / 0.1)',
    'z-index:2147483647',
    'transition:all 60ms ease-out',
    'display:none',
    'top:0', 'left:0', 'width:0', 'height:0',
  ].join(';')
  // Appended on first activation (body may not exist yet at script time).

  const labelEl = document.createElement('div')
  labelEl.style.cssText = [
    'position:fixed',
    'pointer-events:none',
    'padding:2px 6px',
    'background:oklch(0.205 0 0)',
    'color:oklch(0.985 0 0)',
    'font:11px/1.4 ui-monospace,monospace',
    'border-radius:4px',
    'z-index:2147483647',
    'display:none',
  ].join(';')

  function ensureMounted() {
    if (!overlay.parentNode) document.body.appendChild(overlay)
    if (!labelEl.parentNode) document.body.appendChild(labelEl)
  }

  function buildSelector(el: Element | null): string {
    if (!el || el === document.body) return 'body'
    if ((el as HTMLElement).id) return `#${(el as HTMLElement).id}`
    const parts: string[] = []
    let cur: Element | null = el
    while (cur && cur !== document.body && parts.length < 5) {
      let name = cur.tagName.toLowerCase()
      const classes = Array.from(cur.classList).slice(0, 2)
      if (classes.length) name += '.' + classes.join('.')
      parts.unshift(name)
      cur = cur.parentElement
    }
    return parts.join(' > ')
  }

  function describeEl(el: Element) {
    return {
      tag: el.tagName.toLowerCase(),
      id: (el as HTMLElement).id || null,
      classes: Array.from(el.classList),
      text: ((el as HTMLElement).innerText || el.textContent || '').slice(0, 200),
      outerHTML: el.outerHTML.slice(0, 1000),
      selector: buildSelector(el),
    }
  }

  function paintOverlay(el: Element) {
    const r = el.getBoundingClientRect()
    overlay.style.top = `${r.top}px`
    overlay.style.left = `${r.left}px`
    overlay.style.width = `${r.width}px`
    overlay.style.height = `${r.height}px`
    overlay.style.display = 'block'

    labelEl.textContent = buildSelector(el)
    labelEl.style.top = `${Math.max(0, r.top - 22)}px`
    labelEl.style.left = `${r.left}px`
    labelEl.style.display = 'block'
  }

  function onMouseOver(e: MouseEvent) {
    if (!active) return
    const target = e.target as Element
    if (!target || target === overlay || target === labelEl) return
    paintOverlay(target)
  }

  function onClick(e: MouseEvent) {
    if (!active) return
    const target = e.target as Element
    if (!target || target === overlay || target === labelEl) return
    e.preventDefault()
    e.stopPropagation()
    window.parent.postMessage({ type: 'visual-edit-selection', el: describeEl(target) }, '*')
    setActive(false)
  }

  function setActive(on: boolean) {
    active = on
    document.body.style.cursor = on ? 'crosshair' : ''
    if (on) {
      ensureMounted()
    } else {
      overlay.style.display = 'none'
      labelEl.style.display = 'none'
    }
  }

  window.addEventListener('message', (e) => {
    if (e?.data?.type === 'visual-edit-mode') setActive(!!e.data.enabled)
  })

  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('click', onClick, true)
}
