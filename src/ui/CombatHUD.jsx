import React, { useState, useEffect } from 'react'
import { useCombatSystem } from '../state/combatSystem'
import { useWantedSystem } from '../state/wantedSystem'
import { getWeapon } from '../config/weapons'
import '../style/combatHUD.css'

export function CombatHUD() {
  const health = useCombatSystem(s => s.health)
  const maxHealth = useCombatSystem(s => s.maxHealth)
  const armor = useCombatSystem(s => s.armor)
  const maxArmor = useCombatSystem(s => s.maxArmor)
  const currentWeaponId = useCombatSystem(s => s.currentWeaponId)
  const weapons = useCombatSystem(s => s.weapons)
  const switchWeapon = useCombatSystem(s => s.switchWeapon)
  const nextWeapon = useCombatSystem(s => s.nextWeapon)

  const wantedLevel = useWantedSystem(s => s.wantedLevel)
  const bounty = useWantedSystem(s => s.bounty)
  const policeCount = useWantedSystem(s => s.policeCount)

  const healthPercent = (health / maxHealth) * 100
  const armorPercent = (armor / maxArmor) * 100
  const isInDanger = health < 30

  const [showWeapons, setShowWeapons] = useState(false)

  const currentWeapon = getWeapon(currentWeaponId)
  const currentAmmo = weapons[currentWeaponId]?.ammo

  // Hide HUD if no combat
  if (health === maxHealth && wantedLevel === 0 && !showWeapons) {
    return null
  }

  return (
    <div className="combat-hud">
      {/* Health & Armor Bar */}
      <div className="health-armor-section">
        {/* Health */}
        <div className="stat-group">
          <label>Health</label>
          <div className={`stat-bar ${isInDanger ? 'danger' : ''}`}>
            <div className="stat-fill health-fill" style={{ width: `${healthPercent}%` }} />
            <span className="stat-text">{Math.round(health)}</span>
          </div>
        </div>

        {/* Armor */}
        {armor > 0 && (
          <div className="stat-group">
            <label>Armor</label>
            <div className="stat-bar">
              <div className="stat-fill armor-fill" style={{ width: `${armorPercent}%` }} />
              <span className="stat-text">{Math.round(armor)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Wanted Level */}
      {wantedLevel > 0 && (
        <div className="wanted-section">
          <div className="wanted-level">
            <span className="wanted-label">Wanted</span>
            <div className="wanted-stars">
              {Array.from({ length: wantedLevel }).map((_, i) => (
                <span key={i} className="star">⭐</span>
              ))}
            </div>
          </div>
          {bounty > 0 && (
            <div className="bounty">
              💰 ${bounty.toLocaleString()}
            </div>
          )}
          {policeCount > 0 && (
            <div className="police-count">
              🚓 {policeCount} unit{policeCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Weapon System */}
      <div className="weapon-section">
        <button
          className="weapon-toggle"
          onClick={() => setShowWeapons(!showWeapons)}
          title="Press Q/E to cycle weapons"
        >
          {currentWeapon.emoji} {currentWeapon.name}
        </button>

        {/* Ammo Count */}
        {currentWeapon.ammo > 0 && (
          <div className="ammo-display">
            {currentAmmo >= 0 ? (
              <>
                <span className="ammo-count">{currentAmmo}</span>
                <span className="ammo-max">/ {currentWeapon.maxAmmo}</span>
              </>
            ) : (
              <span className="ammo-infinite">∞</span>
            )}
          </div>
        )}

        {/* Weapon List */}
        {showWeapons && (
          <div className="weapon-list">
            {Object.entries(weapons).map(([weaponId, weaponData]) => {
              const weapon = getWeapon(weaponId)
              const isActive = weaponId === currentWeaponId

              return (
                <button
                  key={weaponId}
                  className={`weapon-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    switchWeapon(weaponId)
                    setShowWeapons(false)
                  }}
                  title={weapon.description}
                >
                  <span className="weapon-emoji">{weapon.emoji}</span>
                  <span className="weapon-name">{weapon.name}</span>
                  {weapon.ammo > 0 && (
                    <span className="weapon-ammo">
                      {weaponData.ammo}/{weapon.maxAmmo}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Combat Tips */}
      {health < 40 && (
        <div className="combat-warning">
          ⚠️ Health critical! Find cover or medkit
        </div>
      )}

      {wantedLevel >= 3 && (
        <div className="combat-warning wanted">
          🚓 SWAT Incoming! Find a place to hide
        </div>
      )}
    </div>
  )
}
