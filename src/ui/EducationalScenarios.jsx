import React, { useState } from 'react'
import { useNPCBehaviorSystem, STOP_OUTCOMES, TRAFFIC_VIOLATIONS } from '../state/npcBehaviorSystem'
import '../style/educationalScenarios.css'

export default function EducationalScenarios({ npcId, onClose }) {
  const npcBehavior = useNPCBehaviorSystem()
  const [stage, setStage] = useState('scenario') // scenario, outcome, court, lessons
  const npc = npcBehavior.getNPCStatus(npcId)

  if (!npc) return null

  return (
    <div className="educational-overlay">
      <div className="educational-panel">
        {/* TRAFFIC STOP SCENARIO */}
        {stage === 'scenario' && (
          <div className="scenario-content">
            <h2>🚨 Traffic Stop Scenario</h2>

            <div className="scenario-info">
              <div className="violation-card">
                <div className="violation-emoji">
                  {npc.violation?.emoji}
                </div>
                <div className="violation-details">
                  <h3>{npc.violation?.name}</h3>
                  <p className="severity">
                    Severity: {'⭐'.repeat(npc.violation?.severity || 0)}
                  </p>
                  <p className="fine">
                    Typical Fine: ${npc.violation?.fine || 0}
                  </p>
                </div>
              </div>

              <div className="npc-behavior-info">
                <h3>NPC Behavior: {npc.behavior?.toUpperCase()}</h3>
                <p className="behavior-description">
                  {getBehaviorDescription(npc.behavior)}
                </p>
              </div>

              <div className="scenario-text">
                <p>
                  A police officer pulls over the NPC for <strong>{npc.violation?.name}</strong>.
                </p>
                <p>
                  The officer approaches the vehicle. The NPC's response will be <strong>{npc.behavior}</strong>.
                </p>
                <p className="lesson-hint">
                  💡 Watch how this encounter unfolds based on the NPC's behavior...
                </p>
              </div>
            </div>

            <div className="scenario-buttons">
              <button
                className="btn btn-primary"
                onClick={() => setStage('outcome')}
              >
                Watch Outcome →
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* STOP OUTCOME */}
        {stage === 'outcome' && npc.lastOutcome && (
          <div className="outcome-content">
            <h2>📋 Encounter Outcome</h2>

            <div className="outcome-card">
              <div className="outcome-emoji">
                {getOutcomeEmoji(npc.lastOutcome.id)}
              </div>

              <div className="outcome-details">
                <h3>{npc.lastOutcome.name}</h3>
                <p className="outcome-text">
                  {npc.lastOutcome.outcome}
                </p>

                <div className="consequence-box">
                  <h4>Consequences:</h4>
                  <ul>
                    {npc.lastOutcome.fine > 0 && (
                      <li>💰 Fine: ${npc.lastOutcome.fine}</li>
                    )}
                    {npc.lastOutcome.jail && (
                      <li>🔒 Jail Time: {npc.lastOutcome.jailDays} days</li>
                    )}
                    {npc.lastOutcome.charges && (
                      <li>
                        ⚖️ Charges: {npc.lastOutcome.charges.join(', ')}
                      </li>
                    )}
                    {!npc.lastOutcome.jail && npc.lastOutcome.fine === 0 && (
                      <li>✅ Released with warning</li>
                    )}
                  </ul>
                </div>

                <div className="lesson-box">
                  <h4>Key Lesson:</h4>
                  <p>{getLessonFromOutcome(npc.lastOutcome.id, npc.behavior)}</p>
                </div>
              </div>
            </div>

            {npc.lastOutcome.jail && (
              <button
                className="btn btn-primary"
                onClick={() => setStage('court')}
              >
                Proceed to Court →
              </button>
            )}

            <div className="scenario-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setStage('lessons')}
              >
                View All Lessons
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* COURT SYSTEM */}
        {stage === 'court' && npc.charges && (
          <div className="court-content">
            <h2>⚖️ Court Appearance</h2>

            <div className="court-info">
              <div className="court-building">⚖️</div>

              <div className="court-details">
                <h3>District Courthouse</h3>
                <p>Courtroom 2 - 2:00 PM</p>
              </div>

              <div className="charges-box">
                <h4>Charges:</h4>
                <ul className="charges-list">
                  {npc.charges.map((charge, idx) => (
                    <li key={idx}>• {charge}</li>
                  ))}
                </ul>
              </div>

              <div className="sentence-box">
                <h4>Sentence:</h4>
                <p className="sentence-length">
                  {npc.sentenceDays || 0} days in county jail
                </p>
              </div>

              <div className="bail-info">
                <h4>Bail:</h4>
                <p className="bail-amount">${npc.bail || 5000}</p>
                <p className="bail-note">
                  {npc.bailPaid
                    ? '✅ Bail has been paid'
                    : '⏳ Awaiting bail payment'}
                </p>
              </div>

              <div className="court-lesson">
                <h4>💡 What Happened Here:</h4>
                <p>
                  {getCourtLesson(npc)}
                </p>
              </div>
            </div>

            <div className="scenario-buttons">
              <button
                className="btn btn-primary"
                onClick={() => setStage('lessons')}
              >
                View Educational Lessons
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* EDUCATIONAL LESSONS */}
        {stage === 'lessons' && (
          <div className="lessons-content">
            <h2>📚 Educational Lessons</h2>

            <div className="lessons-grid">
              {Object.entries(npcBehavior.getEducationalLessons()).map(([key, lesson]) => (
                <div key={key} className="lesson-card">
                  <h3>{lesson.title}</h3>
                  <p className="lesson-description">{lesson.description}</p>
                  <ul className="lesson-points">
                    {lesson.points.map((point, idx) => (
                      <li key={idx}>✓ {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="scenario-summary">
              <h3>Your Scenario Summary:</h3>
              <div className="summary-box">
                <p>
                  <strong>NPC Behavior:</strong> {npc.behavior}
                </p>
                <p>
                  <strong>Outcome:</strong> {npc.lastOutcome?.outcome}
                </p>
                {npc.lastOutcome?.jail && (
                  <p>
                    <strong>Consequence:</strong> {npc.sentenceDays} days jail + ${npc.lastOutcome.fine} fine
                  </p>
                )}
                {!npc.lastOutcome?.jail && (
                  <p>
                    <strong>Consequence:</strong> Released with minor penalty
                  </p>
                )}
              </div>
            </div>

            <button
              className="btn btn-secondary btn-block"
              onClick={onClose}
            >
              Close Lesson
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions
function getBehaviorDescription(behavior) {
  const descriptions = {
    compliant: 'Hands visible, polite, follows officer orders. Most likely to result in warning or ticket.',
    nervous: 'Anxious but cooperative. May get a ticket but generally safe outcome.',
    resistant: 'Argues with officer, refuses compliance. Dangerous escalation likely.',
    hostile_armed: 'Reaches for weapon or threatens officer. Highest risk of lethal force.'
  }
  return descriptions[behavior] || 'Unknown behavior'
}

function getOutcomeEmoji(outcomeId) {
  const emojis = {
    compliant_warning: '✅',
    compliant_ticket: '⚠️',
    compliant_arrested: '🚨',
    resistant_tased: '⚡',
    resistant_arrested: '🔒',
    hostile_shooting: '💀',
    fleeing_chase: '🏃'
  }
  return emojis[outcomeId] || '❓'
}

function getLessonFromOutcome(outcomeId, behavior) {
  const lessons = {
    compliant_warning: 'When you comply with police, they often issue a warning. No charges = no court appearance.',
    compliant_ticket: 'A ticket is a minor consequence. You pay the fine and move on. No jail time.',
    compliant_arrested: 'Even when compliant, outstanding warrants can result in arrest. Always know your legal status.',
    resistant_tased: 'Resisting arrest adds serious charges. You now face multiple counts instead of just the original violation.',
    resistant_arrested: 'Fighting with police escalates charges significantly. You trade one charge for several.',
    hostile_shooting: 'Threatening an officer with a weapon results in lethal force. There is no recovery from this outcome.',
    fleeing_chase: 'Fleeing from police adds major charges and lengthy sentences. It\'s never worth it.'
  }
  return lessons[outcomeId] || 'This outcome teaches about the importance of your choices during police encounters.'
}

function getCourtLesson(npc) {
  const chargeCount = npc.charges?.length || 0
  const totalSentence = npc.sentenceDays || 0

  if (chargeCount === 1) {
    return `You faced one charge and received a ${totalSentence}-day sentence. Your early compliance prevented additional charges.`
  } else if (chargeCount === 2) {
    return `You faced ${chargeCount} charges resulting in a ${totalSentence}-day sentence. Resisting added charges to your original violation.`
  } else {
    return `You faced ${chargeCount} serious charges including assault on an officer, resulting in a ${totalSentence}-day sentence. Your actions during the stop created significant legal consequences.`
  }
}
