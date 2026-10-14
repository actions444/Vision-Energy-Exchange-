// PDF reading for the e-book library (pdf.js). Loaded on demand, so the 3D world never waits for it.
// The worker is bundled as text and started from a Blob URL, which also works in the single-file build.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.js?raw'

let workerUrl = null
function ensureWorker() {
  if (workerUrl) return
  workerUrl = URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' }))
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
}

/** Open a PDF from bytes. Scripting and eval are off: a PDF can't run code here. */
export async function loadPdf(data) {
  ensureWorker()
  return pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false, enableXfa: false, disableAutoFetch: true }).promise
}

/** Open a PDF by URL (streams with range requests when the server supports them). */
export async function openPdfUrl(url) {
  ensureWorker()
  return pdfjs.getDocument({ url, isEvalSupported: false, enableXfa: false }).promise
}
