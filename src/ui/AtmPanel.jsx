import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')
const AMOUNTS = [50, 100, 250]

export default function AtmPanel() {
  const wallet = useJobs((s) => s.wallet)
  const bank = useJobs((s) => s.bank)
  const deposit = useJobs((s) => s.deposit)
  const withdraw = useJobs((s) => s.withdraw)
  return (
    <Panel title="ATM" eyebrow="VSE Credits">
      <div className="admin-list">
        <div className="meter accent"><span className="meter-label">Cash on hand</span><strong>{fmt(wallet)} cr</strong></div>
        <div className="meter"><span className="meter-label">Bank balance</span><strong>{fmt(bank)} cr</strong></div>

        <p className="hint">Deposit cash to keep it safe, or withdraw from the bank to spend in person.</p>
        <div className="admin-row">
          <div className="grow"><b>Deposit</b></div>
          {AMOUNTS.map((a) => <button key={a} className="btn" onClick={() => deposit(a)} disabled={wallet < a}>{a}</button>)}
          <button className="btn primary" onClick={() => deposit(wallet)} disabled={wallet <= 0}>All</button>
        </div>
        <div className="admin-row">
          <div className="grow"><b>Withdraw</b></div>
          {AMOUNTS.map((a) => <button key={a} className="btn" onClick={() => withdraw(a)} disabled={bank < a}>{a}</button>)}
          <button className="btn primary" onClick={() => withdraw(bank)} disabled={bank <= 0}>All</button>
        </div>
      </div>
    </Panel>
  )
}
