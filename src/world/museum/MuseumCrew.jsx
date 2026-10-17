import { StaffCrew } from '../../npc/StaffNpcs.jsx'
import { MUSEUM_STAFF, MUSEUM_AREA } from '../../config/museumStaff.js'
import { MUS_FLOOR } from '../../config/museum.js'

/** The museum's working staff: reception, security, tour guide, conservator and a docent. */
export default function MuseumCrew() {
  return <StaffCrew staff={MUSEUM_STAFF} area={MUSEUM_AREA} name="museum" place="Museum of American Heritage" floorY={MUS_FLOOR} />
}
