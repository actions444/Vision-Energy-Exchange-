import { useEffect, useState } from 'react'
import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'
import { JOBS, JOB_CATS, UNIFORMS, PAY, PAY_ORDER, SITES, jobById, uniformById, stopPay, routeBonus, ROUTE_BONUS, WASH_PRICE, ratingTier, ratingMultiplier } from '../config/jobs.js'
import { VEHICLE_PRICES } from '../config/vehicleShop.js'
import { VEHICLE_TYPES, VEHICLE_SPAWNS, JET_SPAWNS, JET_TYPES } from '../vehicles/vehicles.js'
import { BUSINESSES } from '../config/businesses.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')
const TABS = [['overview', 'Overview'], ['jobs', 'Jobs'], ['uniforms', 'Uniforms'], ['garage', 'Garage'], ['business', 'Business'], ['pay', 'Pay & ledger']]
const ALL_SPAWNS = [...VEHICLE_SPAWNS, ...JET_SPAWNS]
const typeOf = (spawn) => VEHICLE_TYPES[spawn.type] || JET_TYPES[spawn.type]

/** Job Center: wallet, jobs, uniforms and payroll in one panel. Everything is saved on this device. */
export default function JobsPanel({ tab: initial }) {
  const [tab, setTab] = useState(initial || 'overview')
  return (
    <Panel title="Job Center" eyebrow="Vision Storms Employment District" wide>
      <div className="chips tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} id={'jobs-tab-' + id} className={'chip-btn' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' && <Overview go={setTab} />}
      {tab === 'jobs' && <JobsTab />}
      {tab === 'uniforms' && <UniformsTab />}
      {tab === 'garage' && <GarageTab />}
      {tab === 'business' && <BusinessTab />}
      {tab === 'pay' && <PayTab />}
      <p className="note">Credits and shifts are saved on this device only. They are a single-player economy for now and are not shared with other players.</p>
    </Panel>
  )
}

function Overview({ go }) {
  const s = useJobs()
  const job = s.jobId && jobById(s.jobId)
  const sched = PAY[s.schedule]
  const daysLeft = s.daysToPay()
  const bonus = Math.round(s.accrued * sched.bonus)
  return (
    <div className="jobs-overview">
      <div className="meter-row">
        <div className="meter accent"><span className="meter-label">Cash</span><strong id="jobs-wallet">{fmt(s.wallet)} cr</strong><em>spend in person</em></div>
        <div className="meter"><span className="meter-label">Bank</span><strong id="jobs-bank">{fmt(s.bank)} cr</strong><em>safe at an ATM</em></div>
        <div className="meter"><span className="meter-label">This pay period</span><strong id="jobs-accrued">{fmt(s.accrued)} cr</strong><em>{job ? `+${fmt(bonus)} bonus on payday` : 'no job yet'}</em></div>
        <div className="meter"><span className="meter-label">World day</span><strong id="jobs-day">Day {s.day}</strong><em>{job ? `${sched.label} pay in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'not employed'}</em></div>
      </div>
      <div className="meter-row">
        <div className="meter"><span className="meter-label">Performance</span><strong id="jobs-rating">{ratingTier(s.rating)}</strong><em>{Math.round(s.rating)}/100 · pays {Math.round(ratingMultiplier(s.rating) * 100)}% of listed rates</em></div>
      </div>
      <p className="note">Your performance rating follows you between jobs. Finish work stops steadily to nudge it up; walking away mid-task costs you. While a task runs, the shift card shows a progress bar — press E again once it's nearly full for a quality-tap bonus, or too early for a small rushed-it penalty. It scales every stop's pay and the route bonus by up to ±20%.</p>

      {job ? (
        <div className="admin-row jobs-current">
          <span style={{ flex: 1 }}>
            <b>{job.title}</b> <small>{job.cat} · {fmt(job.wage)} cr per full shift</small><br />
            <small>Clock in: {job.site.map((x) => SITES[x].name).join(' or ')} · Uniform: {uniformById(job.uniform).name} {s.owned.includes(job.uniform) ? '(owned)' : '(not bought yet)'}</small>
          </span>
          {s.shift && <button className="btn small" id="jobs-clockout" onClick={() => s.clockOut()}>Clock out</button>}
          <button className="btn small danger" id="jobs-quit" onClick={() => s.quit()}>Quit job</button>
        </div>
      ) : (
        <div className="admin-row"><span style={{ flex: 1 }}>You don't have a job yet. Pick one from the list.</span><button className="btn primary small" id="jobs-browse" onClick={() => go('jobs')}>Browse jobs</button></div>
      )}

      <div className="row-actions">
        <button className="btn small" id="jobs-skip1" onClick={() => s.skipDays(1)} title="Advance the pay calendar by a day">Rest until tomorrow</button>
        <button className="btn small" id="jobs-skip7" onClick={() => s.skipDays(7)}>Skip a week</button>
        <button className="btn small" id="jobs-skip30" onClick={() => s.skipDays(30)}>Skip a month</button>
      </div>
      <p className="note">Days also pass by themselves as the day and night clock turns. Skipping ahead only moves the pay calendar so you can see paydays without waiting; it does not move the sun.</p>
      <p className="note">Car washes cost {WASH_PRICE} credits at the pay kiosk.</p>
    </div>
  )
}

function JobsTab() {
  const s = useJobs()
  const [cat, setCat] = useState('All')
  const list = JOBS.filter((j) => cat === 'All' || j.cat === cat)
  return (
    <div>
      <div className="chips">
        {['All', ...JOB_CATS].map((c) => <button key={c} className={'chip-btn' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <ul className="admin-list jobs-list">
        {list.map((j) => {
          const u = uniformById(j.uniform)
          const mine = s.jobId === j.id
          const mult = ratingMultiplier(s.rating)
          return (
            <li key={j.id} className="admin-row" id={'job-' + j.id}>
              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{j.title}</b> <small>{j.cat}</small><br />
                <small>{j.desc}</small><br />
                <small>{fmt(j.wage)} cr per shift ({fmt(stopPay(j) * mult)} per stop, +{fmt(routeBonus(j) * mult)} for finishing, at your current {ratingTier(s.rating)} rating) · {j.route.length} stops · clock in at {j.site.map((x) => SITES[x].name).join(' or ')}</small><br />
                <small>Uniform: {u.name}, {u.price} cr {s.owned.includes(u.id) ? '(you own it)' : ''}</small>
              </span>
              <button className={'btn small ' + (mine ? 'on' : 'primary')} id={'hire-' + j.id} disabled={mine} onClick={() => s.hire(j.id)}>{mine ? 'Your job' : s.jobId ? 'Switch to this' : 'Hire me'}</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Swatch({ u }) {
  return (
    <span className="uni-swatch" aria-hidden="true">
      <i style={{ background: u.suit }} /><i style={{ background: u.pants }} /><i style={{ background: u.trim }} />
      {u.hat && <i style={{ background: u.hat }} />}{u.vest && <i style={{ background: u.vest }} />}
    </span>
  )
}

function UniformsTab() {
  const s = useJobs()
  const my = s.jobId && jobById(s.jobId)
  const list = Object.values(UNIFORMS).sort((a, b) => (my && a.id === my.uniform ? -1 : my && b.id === my.uniform ? 1 : 0))
  return (
    <ul className="admin-list jobs-list">
      {list.map((u) => {
        const owned = s.owned.includes(u.id)
        const worn = s.wearing === u.id
        const forJobs = JOBS.filter((j) => j.uniform === u.id).map((j) => j.title).join(', ')
        return (
          <li key={u.id} className="admin-row" id={'uniform-' + u.id}>
            <Swatch u={u} />
            <span style={{ flex: 1, minWidth: 180 }}>
              <b>{u.name}</b> {my?.uniform === u.id && <small className="free">your job needs this</small>}<br />
              <small>Required for: {forJobs}</small>
            </span>
            {!owned && <button className="btn small primary" id={'buy-' + u.id} onClick={() => s.buyUniform(u.id)}>Buy · {u.price} cr</button>}
            {owned && <button className={'btn small ' + (worn ? 'on' : '')} id={'wear-' + u.id} onClick={() => s.wear(worn ? null : u.id)}>{worn ? 'Wearing' : 'Wear'}</button>}
          </li>
        )
      })}
    </ul>
  )
}

function GarageTab() {
  const s = useJobs()
  const owned = ALL_SPAWNS.filter((sp) => s.vehicles.includes(sp.id))
  const forSale = ALL_SPAWNS.filter((sp) => VEHICLE_PRICES[sp.id] && !s.vehicles.includes(sp.id))
  return (
    <div>
      <p className="eyebrow">Your vehicles ({owned.length})</p>
      {owned.length === 0 && <p className="note">You don't own any vehicles yet — the Plaza's SUV, sedan, pickup and 4x4 are always free to drive. Everything else (the Vision Motors showroom, the Isla Serena beach fleet, and the Skyport jets) is bought in person: walk up and press E, same wallet as everywhere else.</p>}
      <ul className="admin-list jobs-list">
        {owned.map((sp) => {
          const t = typeOf(sp)
          return (
            <li key={sp.id} className="admin-row">
              <span style={{ flex: 1 }}><b>{t?.name}</b> <small>{t?.kind}</small></span>
              <small>Bought for {fmt(VEHICLE_PRICES[sp.id] || 0)} cr</small>
            </li>
          )
        })}
      </ul>
      <p className="eyebrow">For sale ({forSale.length})</p>
      <ul className="admin-list jobs-list">
        {forSale.map((sp) => {
          const t = typeOf(sp)
          return (
            <li key={sp.id} className="admin-row">
              <span style={{ flex: 1 }}><b>{t?.name}</b> <small>{t?.kind}</small></span>
              <b>{fmt(VEHICLE_PRICES[sp.id])} cr</b>
            </li>
          )
        })}
      </ul>
      <p className="note">Walk up to any vehicle for sale and press E to buy it — once it's yours, you can drive or fly it any time, from anywhere it's parked.</p>
    </div>
  )
}

function BusinessTab() {
  const s = useJobs()
  const owned = BUSINESSES.filter((b) => s.businesses[b.id])
  const forSale = BUSINESSES.filter((b) => !s.businesses[b.id])
  const totalDaily = owned.reduce((sum, b) => sum + b.dailyIncome, 0)
  return (
    <div>
      <p className="eyebrow">Your stakes ({owned.length})</p>
      {owned.length === 0 && <p className="note">You don't own a stake in any business yet. Buy one below — it pays out automatically every world day, added straight to your cash, no collecting required.</p>}
      {owned.length > 0 && (
        <div className="meter-row">
          <div className="meter accent"><span className="meter-label">Daily income</span><strong>{fmt(totalDaily)} cr</strong><em>paid automatically each day</em></div>
        </div>
      )}
      <ul className="admin-list jobs-list">
        {owned.map((b) => {
          const rec = s.businesses[b.id]
          return (
            <li key={b.id} className="admin-row">
              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{b.name}</b> <small>owned since day {rec.boughtDay}</small><br />
                <small>{b.desc}</small>
              </span>
              <b>+{fmt(b.dailyIncome)} cr/day</b>
            </li>
          )
        })}
      </ul>
      <p className="eyebrow">Stakes for sale</p>
      <ul className="admin-list jobs-list">
        {forSale.map((b) => (
          <li key={b.id} className="admin-row">
            <span style={{ flex: 1, minWidth: 200 }}>
              <b>{b.name}</b> <small>{fmt(b.dailyIncome)} cr/day</small><br />
              <small>{b.desc}</small>
            </span>
            <button className="btn small primary" onClick={() => s.buyBusiness(b.id)} disabled={s.wallet < b.price}>Buy stake · {fmt(b.price)} cr</button>
          </li>
        ))}
      </ul>
      <p className="note">Business income pays out from thin air (it's not funded by other players' spending at these places) — it's a passive-income layer on top of the wage jobs, same single-player credits wallet.</p>
    </div>
  )
}

function BankTab() {
  const s = useJobs()
  const job = s.jobId && jobById(s.jobId)
  const limit = s.loanLimit()
  const available = Math.max(0, limit - s.loan)
  const [amount, setAmount] = useState('')
  const n = Math.max(0, Math.round(Number(amount) || 0))
  return (
    <div className="jobs-pay">
      <p className="eyebrow">Vision Storms Bank · Cash advance</p>
      <p className="note">
        {job
          ? `Borrow against an upcoming paycheck. Up to half of each payday automatically goes toward what you owe until it's paid off - the rest still lands in your wallet.`
          : `Advances are sized by your paycheck, so you need a job before the bank will lend you anything.`}
      </p>
      <div className="meter-row">
        <div className="meter"><span className="meter-label">Owed</span><strong id="bank-owed">{fmt(s.loan)} cr</strong><em>auto-repaid from payday</em></div>
        <div className="meter accent"><span className="meter-label">Available credit</span><strong id="bank-available">{fmt(available)} cr</strong><em>of a {fmt(limit)} cr line</em></div>
      </div>
      <div className="row-actions">
        <input type="number" min="0" step="50" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 120 }} aria-label="Credits" />
        <button className="btn primary small" id="bank-advance" disabled={!job || n <= 0 || n > available} onClick={() => { if (s.takeLoan(n)) setAmount('') }}>Get advance</button>
        <button className="btn small" id="bank-repay" disabled={s.loan <= 0 || n <= 0} onClick={() => { if (s.repayLoan(n)) setAmount('') }}>Pay down now</button>
      </div>
      <p className="note">Paying down early (straight from your wallet) is always optional - the automatic payday deduction gets you there either way.</p>
    </div>
  )
}

function PayTab() {
  const s = useJobs()
  const job = s.jobId && jobById(s.jobId)
  const sched = PAY[s.schedule]
  const next = s.periodStart + sched.days
  return (
    <div className="jobs-pay">
      <BankTab />
      <p className="eyebrow">Pay schedule</p>
      <div className="row-actions">
        {PAY_ORDER.map((id) => (
          <button key={id} id={'sched-' + id} className={'btn ' + (s.schedule === id ? 'on' : '')} onClick={() => s.setSchedule(id)}>
            {PAY[id].label}{PAY[id].bonus ? ` +${Math.round(PAY[id].bonus * 100)}%` : ''}
          </button>
        ))}
      </div>
      <p className="note" id="sched-note">{sched.note} Your pay is saved up during the period and paid together on payday. Longer periods pay a bigger bonus on what you earned.</p>
      <div className="meter-row">
        <div className="meter"><span className="meter-label">Period started</span><strong>Day {s.periodStart}</strong></div>
        <div className="meter"><span className="meter-label">Next payday</span><strong id="pay-next">Day {next}</strong><em>{job ? `in ${s.daysToPay()} days` : 'no job'}</em></div>
        <div className="meter accent"><span className="meter-label">Pays out</span><strong id="pay-projected">{fmt(s.accrued + Math.round(s.accrued * sched.bonus))} cr</strong><em>{fmt(s.accrued)} earned + bonus</em></div>
      </div>
      <p className="eyebrow">Ledger</p>
      {s.ledger.length === 0 && <p className="note">Nothing yet.</p>}
      <ul className="admin-list jobs-ledger" id="jobs-ledger">
        {s.ledger.slice(0, 40).map((l, i) => (
          <li key={i} className="admin-row">
            <small style={{ width: 56 }}>Day {l.day}</small>
            <span style={{ flex: 1 }}>{l.text}</span>
            <b style={{ color: l.amount < 0 ? '#ff8a8a' : l.amount > 0 ? '#4fe0a0' : undefined }}>{l.amount > 0 ? '+' : ''}{fmt(l.amount)}</b>
          </li>
        ))}
      </ul>
      <p className="note">Finishing a whole route pays a {Math.round(ROUTE_BONUS * 100)}% bonus on the shift wage.</p>
    </div>
  )
}
