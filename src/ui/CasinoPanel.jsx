import { useState } from 'react'
import { Panel } from './UI.jsx'
import { useJobs } from '../state/jobs.js'
import { spinSlots, spinRoulette, colorOf, useBlackjack, SLOT_BET, handTotal } from '../state/casino.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

// ---------------------------------------------------------------------------
export function SlotsPanel() {
  const wallet = useJobs((s) => s.wallet)
  const [reels, setReels] = useState(['🍒', '🍋', '🔔'])
  const [spinning, setSpinning] = useState(false)
  const [last, setLast] = useState(null)

  const spin = () => {
    if (spinning || wallet < SLOT_BET) return
    setSpinning(true)
    setLast(null)
    let ticks = 0
    const GLYPHS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣']
    const timer = setInterval(() => {
      setReels([0, 1, 2].map(() => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
      ticks++
      if (ticks > 9) {
        clearInterval(timer)
        const result = spinSlots(SLOT_BET)
        if (result) { setReels(result.reels); setLast(result) }
        setSpinning(false)
      }
    }, 80)
  }

  return (
    <Panel title="Lucky Sevens Slots" eyebrow="The Jackpot Exchange">
      <div className="admin-list">
        <div className="meter accent"><span className="meter-label">Cash on hand</span><strong>{fmt(wallet)} cr</strong></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 56, margin: '18px 0', letterSpacing: 4 }}>
          {reels.map((g, i) => <span key={i}>{g}</span>)}
        </div>
        {last && (
          <p className="hint" style={{ textAlign: 'center' }}>
            {last.win ? `You won ${fmt(last.payout)} credits!` : 'No match — try again.'}
          </p>
        )}
        <div className="admin-row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={spin} disabled={spinning || wallet < SLOT_BET}>
            {spinning ? 'Spinning…' : `Spin · ${SLOT_BET} cr`}
          </button>
        </div>
        <p className="hint">Three of a kind pays out — diamonds and sevens pay the most. Two cherries up front gives a small payback.</p>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
const BET_AMOUNTS = [10, 25, 50]
export function RoulettePanel() {
  const wallet = useJobs((s) => s.wallet)
  const [amount, setAmount] = useState(10)
  const [spinning, setSpinning] = useState(false)
  const [number, setNumber] = useState(null)
  const [last, setLast] = useState(null)

  const place = (bet) => {
    if (spinning || wallet < amount) return
    setSpinning(true)
    setLast(null)
    let ticks = 0
    const timer = setInterval(() => {
      setNumber(Math.floor(Math.random() * 37))
      ticks++
      if (ticks > 12) {
        clearInterval(timer)
        const result = spinRoulette(bet, amount)
        if (result) { setNumber(result.number); setLast(result) }
        setSpinning(false)
      }
    }, 70)
  }

  const dotColor = (n) => (n === null ? '#555' : colorOf(n) === 'red' ? '#c23a3a' : colorOf(n) === 'black' ? '#222' : '#2e8b57')

  return (
    <Panel title="Roulette" eyebrow="The Jackpot Exchange" wide>
      <div className="admin-list">
        <div className="meter accent"><span className="meter-label">Cash on hand</span><strong>{fmt(wallet)} cr</strong></div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: dotColor(number), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', border: '2px solid #cfae57' }}>
            {number === null ? '–' : number}
          </div>
        </div>
        {last && (
          <p className="hint" style={{ textAlign: 'center' }}>
            {last.win ? `Winner! +${fmt(last.payout)} credits` : `${last.number} ${last.color} — no win.`}
          </p>
        )}

        <div className="admin-row">
          <div className="grow"><b>Bet amount</b></div>
          {BET_AMOUNTS.map((a) => (
            <button key={a} className={'btn' + (amount === a ? ' primary' : '')} onClick={() => setAmount(a)} disabled={spinning}>{a}</button>
          ))}
        </div>

        <div className="admin-row">
          <div className="grow"><b>Color · pays 1:1</b></div>
          <button className="btn" style={{ background: '#c23a3a', color: '#fff' }} onClick={() => place({ kind: 'color', value: 'red' })} disabled={spinning || wallet < amount}>Red</button>
          <button className="btn" style={{ background: '#1c1c1c', color: '#fff' }} onClick={() => place({ kind: 'color', value: 'black' })} disabled={spinning || wallet < amount}>Black</button>
        </div>
        <div className="admin-row">
          <div className="grow"><b>Odd / even · pays 1:1</b></div>
          <button className="btn" onClick={() => place({ kind: 'parity', value: 'odd' })} disabled={spinning || wallet < amount}>Odd</button>
          <button className="btn" onClick={() => place({ kind: 'parity', value: 'even' })} disabled={spinning || wallet < amount}>Even</button>
        </div>
        <div className="admin-row">
          <div className="grow"><b>1-18 / 19-36 · pays 1:1</b></div>
          <button className="btn" onClick={() => place({ kind: 'range', value: 'low' })} disabled={spinning || wallet < amount}>1–18</button>
          <button className="btn" onClick={() => place({ kind: 'range', value: 'high' })} disabled={spinning || wallet < amount}>19–36</button>
        </div>
        <div className="admin-row">
          <div className="grow"><b>Straight number · pays 35:1</b></div>
          <NumberBet onBet={(n) => place({ kind: 'number', value: n })} disabled={spinning || wallet < amount} />
        </div>
      </div>
    </Panel>
  )
}

function NumberBet({ onBet, disabled }) {
  const [n, setN] = useState(0)
  return (
    <>
      <input type="number" min={0} max={36} value={n} onChange={(e) => setN(Math.max(0, Math.min(36, Number(e.target.value) || 0)))} style={{ width: 56 }} />
      <button className="btn" onClick={() => onBet(n)} disabled={disabled}>Bet #{n}</button>
    </>
  )
}

// ---------------------------------------------------------------------------
const BJ_AMOUNTS = [10, 25, 50]
function Hand({ title, cards, total, hideHole }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="meter-label">{title}{!hideHole && total !== undefined ? ` · ${total}` : ''}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ width: 38, height: 54, borderRadius: 6, background: hideHole && i === 1 ? '#2a2d33' : '#fff', color: ['♥', '♦'].includes(c.s) ? '#c23a3a' : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, border: '1px solid #0003' }}>
            {hideHole && i === 1 ? '?' : `${c.r}${c.s}`}
          </div>
        ))}
      </div>
    </div>
  )
}
export function BlackjackPanel() {
  const wallet = useJobs((s) => s.wallet)
  const bj = useBlackjack()
  const [amount, setAmount] = useState(25)

  const hideHole = bj.active && bj.status === 'player'
  const playerTotal = bj.active ? handTotal(bj.player) : 0
  const dealerTotal = bj.active ? handTotal(bj.dealer) : 0

  return (
    <Panel title="Blackjack" eyebrow="The Jackpot Exchange" wide>
      <div className="admin-list">
        <div className="meter accent"><span className="meter-label">Cash on hand</span><strong>{fmt(wallet)} cr</strong></div>

        {!bj.active && (
          <>
            <div className="admin-row">
              <div className="grow"><b>Bet amount</b></div>
              {BJ_AMOUNTS.map((a) => (
                <button key={a} className={'btn' + (amount === a ? ' primary' : '')} onClick={() => setAmount(a)}>{a}</button>
              ))}
            </div>
            <div className="admin-row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={() => bj.start(amount)} disabled={wallet < amount}>Deal · {amount} cr</button>
            </div>
            <p className="hint">Blackjack pays 3:2. Dealer hits until 17. Hit or stand — no doubling or splitting at this table.</p>
          </>
        )}

        {bj.active && (
          <>
            <Hand title="Dealer" cards={bj.dealer} total={dealerTotal} hideHole={hideHole} />
            <Hand title="You" cards={bj.player} total={playerTotal} />
            {bj.status === 'player' && (
              <div className="admin-row" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={bj.hit}>Hit</button>
                <button className="btn" onClick={bj.stand}>Stand</button>
              </div>
            )}
            {bj.status === 'done' && bj.result && (
              <>
                <p className="hint" style={{ textAlign: 'center' }}>
                  {bj.result.outcome === 'blackjack' && `Blackjack! +${fmt(bj.result.payout)} credits`}
                  {bj.result.outcome === 'win' && `You win +${fmt(bj.result.payout)} credits`}
                  {bj.result.outcome === 'push' && `Push — ${fmt(bj.result.payout)} credits back`}
                  {bj.result.outcome === 'lose' && 'Dealer wins this hand.'}
                </p>
                <div className="admin-row" style={{ justifyContent: 'center' }}>
                  <button className="btn primary" onClick={bj.reset}>Play again</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}
