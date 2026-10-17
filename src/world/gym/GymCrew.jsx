import { StaffCrew } from '../../npc/StaffNpcs.jsx'
import { GYM_STAFF, GYM_AREA, FY } from '../../config/gymStaff.js'

/** The gym's working staff, a trainer and four members mid-workout. */
export default function GymCrew() {
  return <StaffCrew staff={GYM_STAFF} area={GYM_AREA} name="gym" place="Storm Athletic Club" floorY={FY} />
}
