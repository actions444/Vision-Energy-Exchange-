// Turns dist-single/index.html into a body-only page for hosts that wrap pages in their own
// <html>/<head>/<body> (used for the Claude artifact preview). Not needed for normal hosting.
// The inlined bundle itself contains strings like "</head>" and "<body>", so only the tags
// outside the script are touched.
import fs from 'node:fs'
const html = fs.readFileSync('dist-single/index.html', 'utf8')
const start = html.indexOf('<head>') + 6
const end = html.lastIndexOf('</body>')
let content = html.slice(start, end)
const firstScript = content.indexOf('<script')
const lastScriptEnd = content.lastIndexOf('</script>') + 9
const pre = content.slice(0, firstScript).replace(/<meta[^>]*>\s*/g, '')
const script = content.slice(firstScript, lastScriptEnd)
const post = content.slice(lastScriptEnd).replace('</head>', '').replace('<body>', '')
fs.writeFileSync('dist-single/artifact.html', pre.trim() + '\n' + script + '\n' + post.trim() + '\n')
console.log('artifact.html', (fs.statSync('dist-single/artifact.html').size / 1048576).toFixed(2), 'MB')
