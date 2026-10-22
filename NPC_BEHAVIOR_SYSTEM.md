# Vision Storms World - NPC Behavior & Educational System

## Overview

The NPC Behavior System creates realistic, educational scenarios that teach players how to stay safe during police encounters. It demonstrates the real-world consequences of compliance vs. resistance through interactive scenarios featuring traffic stops, police interactions, arrest procedures, and court outcomes.

## Core Purpose

**Mission:** Teach people how to stay alive while being harassed/during police encounters.

The system shows:
- ✅ Compliant behavior outcomes (warnings, tickets, release)
- ⚠️ Resistant behavior outcomes (tased, arrested, added charges)
- 🚨 Hostile behavior outcomes (lethal force)
- ⚖️ Court system consequences (bail, charges, sentencing)

---

## System Architecture

### 1. Traffic Violations

Six types of traffic violations trigger police stops:

```javascript
TRAFFIC_VIOLATIONS = {
  red_light: { severity: 2, fine: 150 },
  expired_tags: { severity: 1, fine: 100 },
  broken_taillight: { severity: 1, fine: 75 },
  speeding: { severity: 2, fine: 200 },
  unsafe_lane_change: { severity: 1, fine: 125 },
  no_seatbelt: { severity: 1, fine: 50 }
}
```

**How to Use:**
```javascript
const { assignRandomViolation } = useNPCBehaviorSystem()
assignRandomViolation(npcId) // Assigns a random violation to an NPC
```

### 2. NPC Behaviors

Four types of NPC behavioral responses during police stops:

| Behavior | Description | Risk Level |
|----------|-------------|-----------|
| **compliant** | Hands visible, follows orders, polite | ✅ Low |
| **nervous** | Anxious but cooperative | ⚠️ Low-Medium |
| **resistant** | Argues, refuses compliance, escalates | 🔴 High |
| **hostile_armed** | Threatens officer, reaches for weapon | 🚨 Critical |

### 3. Stop Outcomes

Seven possible outcomes based on NPC behavior:

#### ✅ Compliant Outcomes
- **Warning Only**: Released with warning, $0 fine, no charges
- **Ticket Issued**: Released with ticket, $100 fine, no charges
- **Arrest (Warrant)**: Compliant behavior BUT outstanding warrant found, $0 fine, 3 days jail

#### ⚠️ Resistant Outcomes
- **Resisted, Tased**: Tased + arrested, $500 fine, 5 days jail, resisting arrest charge
- **Resisted, Arrested**: Forcibly arrested, $1000 fine, 7 days jail, resisting + assault charges

#### 🚨 Hostile/Fleeing Outcomes
- **Armed/Hostile**: Officer uses lethal force, NPC killed
- **Fled Police**: Chase/arrest, $2000 fine, 10 days jail, fleeing charge

**Impact Example:**
```
Compliant → Warning → Home → No court
Resistant → Tased → Arrested → Court → 5-7 days jail
Hostile → Lethal Force → Dead → Game Over
```

---

## Using the System

### Basic Flow

```javascript
import { useNPCBehaviorSystem } from '../state/npcBehaviorSystem'

const MyComponent = () => {
  const npcBehavior = useNPCBehaviorSystem()

  // 1. Assign a random violation
  npcBehavior.assignRandomViolation('npc_1')

  // 2. Initiate a police stop
  npcBehavior.initiatePoliceStop('npc_1', 'police_unit_1', violation)

  // 3. Resolve based on NPC behavior
  if (npcBehavior.getNPCStatus('npc_1').behavior === 'compliant') {
    npcBehavior.compliantStop('police_unit_1')
  } else if (npcBehavior.getNPCStatus('npc_1').behavior === 'resistant') {
    npcBehavior.resistantStop('police_unit_1')
  } else if (npcBehavior.getNPCStatus('npc_1').behavior === 'hostile_armed') {
    npcBehavior.hostileStop('police_unit_1')
  }

  // 4. If arrested, schedule court
  const npc = npcBehavior.getNPCStatus('npc_1')
  if (npc.needsCourt) {
    npcBehavior.scheduleCourtAppearance(
      'npc_1',
      npc.charges,
      5000 // bail amount
    )
  }

  // 5. Hold court hearing
  npcBehavior.holdCourt('npc_1')

  // 6. Record the scenario
  npcBehavior.recordScenarioCompletion(
    'scenario_traffic_stop_1',
    npc.lastOutcome.id
  )
}
```

### API Reference

#### NPC Traffic Violations
```javascript
assignRandomViolation(npcId: string)
// Assigns random violation to NPC
// State: npc.violation, npc.state = 'violation'
```

#### Police Stop Mechanics
```javascript
initiatePoliceStop(npcId: string, policeId: string, violation: object)
// Starts traffic stop, assigns random NPC behavior
// State: npc.state = 'police_stop', activeStop created

compliantStop(policeId: string)
// Compliant NPC gets warning or ticket
// State: npc.state = 'home', no jail/charges

resistantStop(policeId: string)
// Resistant NPC gets tased or arrested
// State: npc.state = 'arrest', jail + charges added

hostileStop(policeId: string)
// Hostile NPC shot by officer, lethal force
// State: npc.state = 'deceased', npc.alive = false
```

#### Court System
```javascript
scheduleCourtAppearance(npcId: string, charges: string[], bail?: number)
// Books court appearance 7 days in future
// State: npc.state = 'court', npc.scheduledCourt = true

payBail(npcId: string, amount: number)
// Pay bail to be released pending trial
// Returns: boolean (success/failure)

holdCourt(npcId: string)
// Calculate sentence based on charges
// State: npc.courtAppearanceComplete = true, sentenceDays calculated

getEducationalLessons()
// Returns all 4 educational lessons
// Lesson 1: The Traffic Stop
// Lesson 2: Compliance vs Resistance
// Lesson 3: The Court System
// Lesson 4: Your Rights
```

#### Utility Methods
```javascript
getNPCStatus(npcId: string)
// Get full NPC behavior state

getScenarioOutcome(scenario: string)
// Get lesson from outcome

recordScenarioCompletion(scenarioId: string, outcome: string)
// Track completed scenarios for statistics
```

---

## Educational Scenarios

### Scenario 1: Traffic Stop - Compliant NPC
```
RED LIGHT VIOLATION
├─ NPC: Compliant
├─ Officer: Routine stop
├─ Outcome: Warning or Ticket
└─ Lesson: Compliance = Safety + Release
   - No charges
   - No jail
   - Quick release
   - Can fight ticket in court later
```

### Scenario 2: Traffic Stop - Resistant NPC
```
EXPIRED TAGS
├─ NPC: Resistant (argues with officer)
├─ Officer: Escalates due to behavior
├─ Outcome: Tased and Arrested
└─ Lesson: Every action adds charges
   - Original charge: Expired tags
   - Added charges: Resisting arrest, assault on officer
   - Result: 5-7 days jail
   - Record: Criminal record created
```

### Scenario 3: Traffic Stop - Hostile NPC
```
SPEEDING
├─ NPC: Hostile (reaches for weapon)
├─ Officer: Perceives threat
├─ Outcome: Lethal Force Used
└─ Lesson: Don't threaten officers
   - NPC dies
   - No court
   - Game over scenario
```

### Scenario 4: Court Proceeding
```
AFTER ARREST FOR RESISTING
├─ Charges: Resisting arrest, assault on officer, speeding
├─ Bail: $5,000
├─ Court: District Courthouse
├─ Judge: Reviews charges and evidence
└─ Sentence: 7 days county jail
   - Could have been released with warning
   - Compliance would have prevented jail
```

---

## Integration with Game Systems

### Police AI Integration
```javascript
// When police detect NPC
const { usePoliceAI } = require('../state/policeAI')
const { useNPCBehaviorSystem } = require('../state/npcBehaviorSystem')

const policeAI = usePoliceAI()
const npcBehavior = useNPCBehaviorSystem()

// Police stop detected
policeAI.planAmbush(area, npcPos)
npcBehavior.initiatePoliceStop(
  npcId,
  policeUnit.id,
  npcBehavior.getNPCStatus(npcId).violation
)
```

### Building Interior Integration
```javascript
// Court inside courthouse building
const { BUILDINGS } = require('../config/buildings')

const courthouse = BUILDINGS.courthouse
// - 4 courtrooms
// - Judges present
// - Law library
// - Bail bond office
// - Security cameras
```

### Game State Tracking
```javascript
// Track completed educational scenarios
const completedScenarios = npcBehavior.completedScenarios
// Each scenario records:
// - scenarioId
// - outcome (compliant_warning, resistant_tased, etc.)
// - timestamp
```

---

## Educational Content

### Lesson 1: The Traffic Stop
- Most stops are brief
- Cooperation = quick release
- Stay calm, hands visible
- Comply with lawful orders
- Know your rights

### Lesson 2: Compliance vs. Resistance
- Compliant: Warning/ticket, released
- Resistant: Tased, arrested, more charges
- Every action adds to charges
- Fight in court, not on street

### Lesson 3: The Court System
- Bail hearing determines release
- Right to attorney
- Charges determine sentence
- Record affects future encounters

### Lesson 4: Your Rights
- Right to remain silent
- Right to refuse warrantless search
- Right to attorney
- Right to know why you're stopped

---

## UI Components

### EducationalScenarios.jsx
Main component displaying educational scenarios with four stages:

**Stage 1: Scenario**
- Shows traffic violation
- NPC behavior type
- Context and setup
- "Watch Outcome" button

**Stage 2: Outcome**
- Shows what happened
- Consequences (fine, jail, charges)
- Key lesson
- "Court" or "Lessons" buttons

**Stage 3: Court**
- Courthouse setting
- Charges listed
- Sentence length
- Bail information

**Stage 4: Lessons**
- All 4 educational lessons
- Scenario summary
- Comparison of outcomes

---

## System Statistics

### Violation Severity Levels
- **Severity 1:** Minor violations ($50-125 fine)
  - Expired tags, broken taillight, unsafe lane change, no seatbelt
  - Usually: Warning or ticket

- **Severity 2:** Serious violations ($150-200 fine)
  - Running red light, speeding
  - More likely: Ticket

### Consequences by Behavior
| Behavior | Fine | Jail | Charges | Risk |
|----------|------|------|---------|------|
| Compliant | $0-150 | None | None | ✅ Safe |
| Nervous | $100-200 | None | None | ✅ Safe |
| Resistant | $500-1000 | 5-7 days | 2-3 | 🔴 High |
| Hostile | Death | N/A | N/A | 🚨 Fatal |

---

## Best Practices

### 1. Create Realistic Scenarios
- Match violation to severity
- Random behavior creates realism
- Different outcomes each time

### 2. Track Player Learning
- Record which scenarios completed
- Track outcomes seen
- Identify lessons learned

### 3. Use Educational UI
- Show consequences clearly
- Display lessons prominently
- Connect actions to outcomes

### 4. Integrate with Game Flow
- Show scenarios when traffic stops happen
- Display court when NPCs arrested
- Track statistics in player HUD

### 5. Safe Handling
- Handle all outcome types (alive/dead)
- Properly clean up state
- Track bail payments correctly

---

## Example: Full Scenario Flow

```javascript
// 1. NPC spawned in game
const npc = spawnNPC('npc_driver_1', position)

// 2. Police detects violation
const violation = getRandomViolation() // expired_tags
npcBehavior.assignRandomViolation('npc_driver_1')

// 3. Traffic stop initiated
const policeUnit = spawnPolice(npc.position)
npcBehavior.initiatePoliceStop('npc_driver_1', policeUnit.id, violation)

// 4. NPC behavior determines outcome
const npc_state = npcBehavior.getNPCStatus('npc_driver_1')
// Result: behavior = 'resistant' (random)

// 5. Officer responds to behavior
npcBehavior.resistantStop(policeUnit.id)
// NPC: Tased
// Result: Arrested, needs court

// 6. Schedule court appearance
const npc_state = npcBehavior.getNPCStatus('npc_driver_1')
npcBehavior.scheduleCourtAppearance(
  'npc_driver_1',
  ['Resisting arrest', 'Assault on officer', 'Expired tags'],
  5000
)

// 7. Court hearing
npcBehavior.holdCourt('npc_driver_1')
// Sentence: 5 days jail

// 8. Record for learning
npcBehavior.recordScenarioCompletion(
  'traffic_stop_npc_driver_1',
  'resistant_tased'
)

// 9. Display educational UI
showEducationalScenarios('npc_driver_1')
// Player sees:
// - What happened
// - Why it happened
// - Consequences
// - Lessons learned

// 10. Alternative: If NPC was compliant
// Result: Warning only, home, no court
// Lesson: Compliance leads to quick release
```

---

## Summary

The NPC Behavior System teaches critical life lessons through realistic police encounter scenarios. Players see the direct consequences of their (and NPC) choices, learning the importance of:

✅ **Compliance** → Safe, quick resolution
⚠️ **Resistance** → Escalation, jail time
🚨 **Hostility** → Lethal consequences

This educational approach creates a powerful learning tool about staying safe during law enforcement interactions.

---

## Files

- `src/state/npcBehaviorSystem.js` - Core behavior system
- `src/ui/EducationalScenarios.jsx` - UI component
- `src/style/educationalScenarios.css` - Styling
- `src/config/buildings.js` - Courthouse/building system
- `NPC_BEHAVIOR_SYSTEM.md` - This documentation
