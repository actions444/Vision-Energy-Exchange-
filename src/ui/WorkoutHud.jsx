import { useGym } from '../state/gym.js'
import { useStore } from '../state/store.js'

// Live workout card: shown while the player is on a gym machine. Calories use the MET formula; heart rate is simulated.
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

export default function WorkoutHud() {
  const s = useGym((st) => st.session)
  const phase = useStore((st) => st.phase)
  if (!s || phase !== 'playing') return null
  const dist = s.unit === 'km' ? `${s.dist.toFixed(2)} km` : s.unit === 'm' ? `${Math.round(s.dist)} m` : null
  return (
    <div className="workout-hud" role="status" aria-live="off" style={{
      position: 'fixed', left: '50%', top: 64, transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none',
      background: 'rgba(10,12,18,0.82)', border: '1px solid rgba(29,233,214,0.55)', borderRadius: 14, padding: '10px 18px',
      color: '#f4f6fa', font: '600 13px system-ui, sans-serif', backdropFilter: 'blur(6px)', boxShadow: '0 6px 24px rgba(0,0,0,0.45)', minWidth: 280,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
        <span style={{ color: '#1de9d6', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>{s.name}</span>
        <span style={{ font: '700 22px ui-monospace, monospace' }}>{fmt(s.t)}</span>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 6, justifyContent: 'space-between' }}>
        <Stat label="kcal" value={Math.round(s.kcal)} />
        <Stat label="reps" value={s.reps} />
        {dist && <Stat label="dist" value={dist} />}
        <Stat label="bpm (sim)" value={Math.round(s.hr)} hot />
      </div>
      <div style={{ marginTop: 6, fontWeight: 500, fontSize: 11, opacity: 0.7 }}>Press E, Space or walk away to finish</div>
    </div>
  )
}

function Stat({ label, value, hot }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ font: '700 18px ui-monospace, monospace', color: hot ? '#ff7a7a' : '#fff' }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
    </div>
  )
}
