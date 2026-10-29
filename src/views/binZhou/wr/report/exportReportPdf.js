import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const WIDTH = 1046
const HEIGHT = 710
const CSS = `
.wr-pdf-page { box-sizing:border-box; width:${WIDTH}px; height:${HEIGHT}px; padding:0;
  font-family:"Microsoft YaHei",sans-serif; font-size:14px; line-height:1.6; color:#243129; background:white; }
.wr-pdf-page * { box-sizing:border-box; }
.wr-pdf-page h1 { font-size:26px; margin:0 0 12px; }
.wr-pdf-page h2 { font-size:20px; margin:14px 0 8px; }
.wr-pdf-page h3 { font-size:16px; margin:10px 0 6px; }
.wr-pdf-page p { margin:6px 0 10px; overflow-wrap:anywhere; }
.wr-pdf-page .report-header { margin:0 0 16px; }
.wr-pdf-page .report-overview { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin:12px 0 18px; }
.wr-pdf-page .overview-item { grid-column:span 2; padding:14px; border:1px solid #d9e2dc; border-radius:8px; background:#f7faf8; text-align:center; }
.wr-pdf-page .overview-item:nth-last-child(-n+2) { grid-column:span 3; }
.wr-pdf-page .overview-value { display:block; font-size:26px; line-height:36px; margin-top:8px; }
.wr-pdf-page table { width:100%; table-layout:fixed; border-collapse:collapse; margin:8px 0 12px; }
.wr-pdf-page th,.wr-pdf-page td { border:1px solid #bccbc1; padding:7px 9px; font-size:13px; line-height:1.6;
  white-space:normal; word-break:normal; overflow-wrap:anywhere; vertical-align:top; height:auto; }
.wr-pdf-page th { background:#e9f1eb; }
.wr-pdf-page .weather-warning-table .col-index { width:5%; }
.wr-pdf-page .weather-warning-table .col-time { width:16%; }
.wr-pdf-page .weather-warning-table .col-device { width:10%; }
.wr-pdf-page .weather-warning-table .col-indicator { width:12%; }
.wr-pdf-page .weather-warning-table .col-value { width:9%; }
.wr-pdf-page .weather-warning-table .col-level { width:10%; }
.wr-pdf-page .weather-warning-table .col-suggestion { width:38%; }
.wr-pdf-page .pdf-warning-details .col-index { width:6%; }
.wr-pdf-page .pdf-warning-details .col-time { width:24%; }
.wr-pdf-page .pdf-warning-details .col-device { width:16%; }
.wr-pdf-page .pdf-warning-details .col-indicator { width:20%; }
.wr-pdf-page .pdf-warning-details .col-value { width:16%; }
.wr-pdf-page .pdf-warning-details .col-level { width:18%; }
.wr-pdf-page .pdf-advice-block { margin:8px 0 14px; }
.wr-pdf-page .print-page-footer { display:none; }
`

// Measure explicit pages before rasterization; never insert pagination spacers in a table.
export async function buildReportPdf(element, { onPage } = {}) {
  await document.fonts.ready
  const host = document.createElement('div')
  host.style.cssText = `position:absolute;left:-12000px;top:0;width:${WIDTH}px;`
  const style = document.createElement('style')
  style.textContent = CSS
  host.appendChild(style)
  document.body.appendChild(host)
  const pages = []
  let page
  const newPage = () => {
    page = document.createElement('div')
    page.className = 'wr-pdf-page'
    host.appendChild(page)
    pages.push(page)
  }
  newPage()
  const fits = () => page.scrollHeight <= HEIGHT
  const append = node => {
    page.appendChild(node)
    if (fits()) return true
    node.remove()
    return false
  }
  const addText = original => {
    let remaining = original.textContent
    while (remaining) {
      let low = 0, high = remaining.length
      const part = original.cloneNode(false)
      page.appendChild(part)
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        part.textContent = remaining.slice(0, mid)
        if (fits()) low = mid
        else high = mid - 1
      }
      part.textContent = remaining.slice(0, low)
      if (!low) {
        part.remove()
        if (!page.children.length) throw new Error('PDF文本无法适配纸张')
        newPage()
        continue
      }
      remaining = remaining.slice(low)
      if (remaining) newPage()
    }
  }
  const addTable = original => {
    if (original.matches('.weather-warning-table') && !original.matches('.pdf-warning-details')) {
      const compact = original.cloneNode(true)
      compact.classList.add('pdf-warning-details')
      compact.querySelector('colgroup')?.remove()
      ;[...compact.rows].forEach(row => row.lastElementChild?.remove())
      addTable(compact)
      const title = document.createElement('h3')
      title.textContent = '重点预警记录对应处置建议'
      addBlock(title)
      ;[...original.querySelectorAll('tbody > tr')].forEach((row, index) => {
        const block = document.createElement('div')
        block.className = 'pdf-advice-block'
        const heading = document.createElement('h3')
        heading.textContent = `记录 ${index + 1} · ${row.cells[1]?.textContent || ''}`
        const text = document.createElement('p')
        text.textContent = row.lastElementChild.textContent
        block.append(heading, text)
        addBlock(block)
      })
      return
    }
    let table, body
    const startTable = () => {
      table = original.cloneNode(false)
      if (original.querySelector('colgroup')) table.appendChild(original.querySelector('colgroup').cloneNode(true))
      if (original.tHead) table.appendChild(original.tHead.cloneNode(true))
      body = document.createElement('tbody')
      table.appendChild(body)
      page.appendChild(table)
    }
    startTable()
    for (const originalRow of original.querySelectorAll('tbody > tr')) {
      const row = originalRow.cloneNode(true)
      body.appendChild(row)
      if (fits()) continue
      row.remove()
      if (!body.children.length) table.remove()
      newPage()
      startTable()
      body.appendChild(row)
      if (fits()) continue
      row.remove()
      // Oversized rows continue across pages, preserving all cell text and repeating the header.
      let remaining = [...originalRow.cells].map(cell => cell.textContent)
      while (remaining.some(Boolean)) {
        const part = originalRow.cloneNode(true)
        body.appendChild(part)
        let low = 0, high = Math.max(...remaining.map(text => text.length))
        while (low < high) {
          const mid = Math.ceil((low + high) / 2)
          ;[...part.cells].forEach((cell, i) => { cell.textContent = remaining[i].slice(0, mid) })
          if (fits()) low = mid
          else high = mid - 1
        }
        if (!low) throw new Error('PDF表格表头或单元格无法适配纸张')
        ;[...part.cells].forEach((cell, i) => { cell.textContent = remaining[i].slice(0, low) })
        remaining = remaining.map(text => text.slice(low))
        if (remaining.some(Boolean)) { newPage(); startTable() }
      }
    }
  }
  const addBlock = original => {
    if (original.matches?.('.hide-on-print,.print-page-footer')) return
    if (original.tagName === 'TABLE') { addTable(original); return }
    const clone = original.cloneNode(true)
    if (append(clone)) return
    if (original.querySelector('table') || original.matches('.report-section,.record-list')) {
      const children = [...original.children]
      children.forEach((child, i) => {
        if (/^H[123]$/.test(child.tagName) && children[i + 1]) {
          const next = children[i + 1]
          const preview = document.createElement('div')
          preview.appendChild(child.cloneNode(true))
          const previewTable = next.matches('table') ? next : next.querySelector('table')
          if (previewTable) {
            const t = previewTable.cloneNode(false)
            if (previewTable.tHead) t.appendChild(previewTable.tHead.cloneNode(true))
            const first = previewTable.querySelector('tbody > tr')
            if (first) { const b = document.createElement('tbody'); b.appendChild(first.cloneNode(true)); t.appendChild(b) }
            if (previewTable.matches('.weather-warning-table')) {
              t.classList.add('pdf-warning-details')
              ;[...t.rows].forEach(row => row.lastElementChild?.remove())
            }
            preview.appendChild(t)
          } else {
            const firstLines = next.cloneNode(false)
            firstLines.textContent = next.textContent.slice(0, 100)
            preview.appendChild(firstLines)
          }
          page.appendChild(preview)
          const needsPage = !fits()
          preview.remove()
          if (needsPage && page.children.length) newPage()
        }
        addBlock(child)
      })
      return
    }
    if (page.children.length) newPage()
    if (append(clone)) return
    if (original.children.length && !/^P$/.test(original.tagName)) {
      ;[...original.children].forEach(addBlock)
    } else addText(original)
  }
  try {
    ;[...element.children].forEach(addBlock)
    const nonempty = pages.filter(item => item.children.length)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
    for (let i = 0; i < nonempty.length; i++) {
      const canvas = await html2canvas(nonempty[i], { scale: 1.5, useCORS: true, backgroundColor: '#ffffff', width: WIDTH, height: HEIGHT })
      if (i) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 10, 277, 188)
      pdf.setFontSize(9)
      pdf.setTextColor(110)
      pdf.text(`${i + 1} / ${nonempty.length}`, 287, 204, { align: 'right' })
      if (onPage) await onPage({ index: i, canvas, element: nonempty[i] })
      canvas.width = canvas.height = 0
    }
    return pdf
  } finally {
    host.remove()
  }
}
