import { useEffect, useState } from 'react'
import { useJobs } from '../state/jobs.js'
import { useStore } from '../state/store.js'
import { playerState } from '../state/runtime.js'
import { STOPS, jobById, ratingTier } from '../config/jobs.js'

const fmt = (n) => Math.round(n).toLocaleString('en-US')

/** HUD chip: wallet and job. Click to open the Job Center panel. */
export function JobsChip() {
  const wallet = useJobs((s) => s.wallet)
  const bank = useJobs((s) => s.bank)
  const jobId = useJobs((s) => s.jobId)
  const shift = useJobs((s) => s.shift)
  const open = useStore((s) => s.openPanel)
  const job = jobId && jobById(jobId)
  return (
    <button className={'chip chip-jobs' + (shift ? ' chip-on' : '')} id="hud-jobs" title="Cash, bank, jobs, uniforms and pay" onClick={() => open({ type: 'jobs', tab: 'overview' })}>
      <i className="coin" />{fmt(wallet)} cr{bank > 0 ? ` · ${fmt(bank)} banked` : ''}{job ? ` · ${job.title}${shift ? ' · on shift' : ''}` : ''}
    </button>
  )
}

/** On-screen shift card and task progress while clocked in. */
export function ShiftHud() {
  const shift = useJobs((s) => s.shift)
  const task = useJobs((s) => s.task)
  const jobId = useJobs((s) => s.jobId)
  const rating = useJobs((s) => s.rating)
  const [, tick] = useState(0)
  useEffect(() => {
    if (!shift) return
    const t = setInterval(() => tick((x) => x + 1), 150)
    return () => clearInterval(t)
  }, [shift])
  if (!shift) return null
  const job = jobById(jobId)
  const stop = STOPS[shift.route[shift.idx]]
  const p = playerState.position
  const dist = stop ? Math.hypot(stop.x - p.x, stop.z - p.z) : 0
  const prog = task ? Math.min(1, (performance.now() - task.start) / (task.secs * 1000)) : 0
  return (
    <div className="shift-card" id="shift-card" role="status">
      <small>{job?.title} · stop {Math.min(shift.idx + 1, shift.route.length)} of {shift.route.length} · {ratingTier(rating)}</small>
      <b id="shift-stop">{stop?.label}</b>
      <span>{task ? `${stop.verb}…` : dist < 2.6 ? `Press E: ${stop.verb}` : `Go to the gold beacon · ${Math.round(dist)} m`}</span>
      {task && (
        <>
          <div className="shift-bar"><i style={{ width: prog * 100 + '%' }} />{!task.tapped && <span className="sweet" />}</div>
          {!task.tapped && <small className="shift-tip">{prog >= 0.75 ? 'Press E now for a performance bonus!' : 'Press E again near the end for a bonus'}</small>}
        </>
      )}
      <em>Earned this shift: {fmt(shift.earned)} cr</em>
    </div>
  )
}
