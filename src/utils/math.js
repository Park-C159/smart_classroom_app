import katex from 'katex'

/**
 * Render LaTeX formulas in text to HTML using KaTeX.
 * Supports: $...$, $$...$$, \(...\), \[...\]
 *
 * @param {string} text - Input text potentially containing LaTeX
 * @returns {string} HTML with KaTeX-rendered formulas
 */
export function renderMath(text) {
  if (!text) return ''

  let html = text

  // Normalize legacy delimiters
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, f) => `$${f.trim()}$`)
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, f) => `$$\n${f.trim()}\n$$`)

  // Render display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true, throwOnError: false,
      })
    } catch {
      return _
    }
  })

  // Render inline math $...$
  html = html.replace(/\$([^$]+?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false, throwOnError: false,
      })
    } catch {
      return _
    }
  })

  // NOTE: Do NOT replace \n with <br> — KaTeX SVG path data contains newlines.
  // Use CSS white-space: pre-wrap on content containers instead.
  return html
}

export default renderMath
