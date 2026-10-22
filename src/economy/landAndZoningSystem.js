/**
 * VISION STORMS WORLD - Land Purchase & Zoning System
 *
 * Player-driven city development:
 * - Purchase undeveloped land parcels
 * - Zoning for specific uses (residential, commercial, industrial)
 * - Building construction on owned land
 * - Land value appreciation based on development
 * - Lease income from commercial developments
 * - City planning and expansion
 * - Environmental zones and protection
 * - Neighborhood development tracking
 *
 * Creates dynamic, evolving city shaped by player choices
 */

import { create } from 'zustand'

export const useLandAndZoningSystem = create((set, get) => ({
  // ===== LAND & ZONING REGISTRY =====
  landParcels: {}, // parcelId -> parcel data
  playerLand: {}, // playerId -> [parcelIds]
  zoneMap: {}, // coordinates -> zone type
  developments: {}, // developmentId -> development data
  masterPlan: {
    neighborhoods: {},
    zoning: {}
  },

  // ===== CREATE LAND PARCEL =====
  createLandParcel: (parcelData) => {
    // parcelData = {
    //   location, coordinates, size, neighborhood
    //   zoning, price, taxRate, developmentPotential
    // }

    const parcelId = `land_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const parcel = {
      id: parcelId,
      location: parcelData.location,
      coordinates: parcelData.coordinates, // {x, y, z}
      size: parcelData.size || 'standard', // small, standard, large, estate
      acreage: parcelData.acreage || 1.0,
      neighborhood: parcelData.neighborhood,

      // ZONING & DESIGNATION
      currentZoning: parcelData.zoning || 'unzoned',
      allowedZoning: parcelData.allowedZoning || [
        'residential',
        'commercial',
        'mixed_use',
        'industrial',
        'green_space',
        'public'
      ],
      environmentalStatus: parcelData.environmentalStatus || 'clear',

      // PROPERTY
      owner: null, // playerId when purchased
      price: parcelData.price || 50000,
      marketValue: parcelData.price || 50000,
      taxRate: parcelData.taxRate || 0.012, // 1.2% annually
      annualTax: 0,

      // DEVELOPMENT
      developmentPotential: parcelData.developmentPotential || 'high',
      currentDevelopment: null, // developmentId if built on
      developmentHistory: [],
      leaseIncome: 0,

      // STATUS
      status: 'available', // available, owned, developed
      purchaseDate: null,
      createdAt: Date.now()
    }

    parcel.annualTax = Math.floor(parcel.price * parcel.taxRate)

    set(state => ({
      landParcels: {
        ...state.landParcels,
        [parcelId]: parcel
      }
    }))

    return {
      success: true,
      parcelId: parcelId,
      location: parcel.location,
      acreage: parcel.acreage,
      price: parcel.price,
      neighborhood: parcel.neighborhood,
      message: `Land parcel "${parcel.location}" listed for sale`
    }
  },

  // ===== PURCHASE LAND =====
  purchaseLand: (playerId, parcelId, playerCredits) => {
    const parcel = get().landParcels[parcelId]
    if (!parcel) return { success: false, error: 'Parcel not found' }

    if (parcel.status !== 'available') {
      return { success: false, error: 'Land is not available for purchase' }
    }

    if (playerCredits < parcel.price) {
      return { success: false, error: 'Insufficient funds' }
    }

    const updatedParcel = {
      ...parcel,
      owner: playerId,
      status: 'owned',
      purchaseDate: Date.now()
    }

    set(state => ({
      landParcels: {
        ...state.landParcels,
        [parcelId]: updatedParcel
      },
      playerLand: {
        ...state.playerLand,
        [playerId]: [...(state.playerLand[playerId] || []), parcelId]
      }
    }))

    return {
      success: true,
      parcelId: parcelId,
      location: parcel.location,
      acreage: parcel.acreage,
      purchasePrice: parcel.price,
      annualTax: parcel.annualTax,
      message: `You've purchased land at ${parcel.location}!`,
      details: {
        size: parcel.size,
        neighborhood: parcel.neighborhood,
        potentialZoning: parcel.allowedZoning,
        developmentPotential: parcel.developmentPotential
      }
    }
  },

  // ===== REZONE LAND =====
  rezoneParcel: (playerId, parcelId, newZoning) => {
    const parcel = get().landParcels[parcelId]
    if (!parcel || parcel.owner !== playerId) {
      return { success: false, error: 'You do not own this parcel' }
    }

    if (!parcel.allowedZoning.includes(newZoning)) {
      return { success: false, error: `${newZoning} zoning not allowed on this parcel` }
    }

    const rezoning = {
      from: parcel.currentZoning,
      to: newZoning,
      date: Date.now(),
      cost: 5000, // Rezoning fee
      approved: true
    }

    const updatedParcel = {
      ...parcel,
      currentZoning: newZoning,
      developmentHistory: [...parcel.developmentHistory, rezoning]
    }

    set(state => ({
      landParcels: {
        ...state.landParcels,
        [parcelId]: updatedParcel
      }
    }))

    return {
      success: true,
      parcelId: parcelId,
      previousZoning: rezoning.from,
      newZoning: rezoning.to,
      rezoneingFee: rezoning.cost,
      message: `Parcel rezoned from ${rezoning.from} to ${rezoning.to}!`
    }
  },

  // ===== DEVELOP LAND =====
  developLand: (playerId, parcelId, developmentData) => {
    // developmentData = {
    //   type, name, structure, buildingType
    //   estimatedCost, rentPrice
    // }

    const parcel = get().landParcels[parcelId]
    if (!parcel || parcel.owner !== playerId) {
      return { success: false }
    }

    const developmentId = `dev_${parcelId}_${Date.now()}`

    const development = {
      id: developmentId,
      parcelId: parcelId,
      owner: playerId,
      name: developmentData.name,
      type: developmentData.type, // residential, commercial, industrial, mixed
      buildingType: developmentData.buildingType,
      constructionCost: developmentData.constructionCost || 100000,
      rentPrice: developmentData.rentPrice || null,
      capacity: developmentData.capacity || 100,
      status: 'under_construction', // under_construction, operational, abandoned
      constructionStarted: Date.now(),
      constructionEstimate: 30, // days
      yearsOld: 0,
      annualMaintenance: developmentData.constructionCost * 0.02,
      leaseIncome: 0
    }

    set(state => ({
      developments: {
        ...state.developments,
        [developmentId]: development
      },
      landParcels: {
        ...state.landParcels,
        [parcelId]: {
          ...parcel,
          currentDevelopment: developmentId,
          status: 'developed',
          developmentHistory: [
            ...parcel.developmentHistory,
            { type: 'construction_started', date: Date.now() }
          ]
        }
      }
    }))

    return {
      success: true,
      developmentId: developmentId,
      name: development.name,
      type: development.type,
      constructionCost: development.constructionCost,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      message: `Construction started: ${development.name}`
    }
  },

  // ===== COMPLETE CONSTRUCTION =====
  completeConstruction: (playerId, developmentId) => {
    const development = get().developments[developmentId]
    if (!development || development.owner !== playerId) {
      return { success: false }
    }

    const updatedDevelopment = {
      ...development,
      status: 'operational'
    }

    set(state => ({
      developments: {
        ...state.developments,
        [developmentId]: updatedDevelopment
      }
    }))

    return {
      success: true,
      developmentId: developmentId,
      name: development.name,
      status: 'operational',
      monthlyRent: development.rentPrice,
      annualRentIncome: (development.rentPrice || 0) * 12,
      message: `${development.name} is now operational!`
    }
  },

  // ===== CREATE NEIGHBORHOOD =====
  createNeighborhood: (neighborhoodData) => {
    const neighborhoodId = `neighborhood_${Date.now()}`

    const neighborhood = {
      id: neighborhoodId,
      name: neighborhoodData.name,
      description: neighborhoodData.description,
      centerCoordinates: neighborhoodData.centerCoordinates,
      radius: neighborhoodData.radius || 500, // meters
      zoning: neighborhoodData.zoning || 'mixed',
      developmentLevel: 'developing', // undeveloped, developing, developed, mature
      population: 0,
      amenities: neighborhoodData.amenities || [],
      developments: [],
      properties: [],
      landValue: neighborhoodData.landValue || 50000,
      status: 'active',
      createdAt: Date.now()
    }

    set(state => ({
      masterPlan: {
        ...state.masterPlan,
        neighborhoods: {
          ...state.masterPlan.neighborhoods,
          [neighborhoodId]: neighborhood
        }
      }
    }))

    return {
      success: true,
      neighborhoodId: neighborhoodId,
      name: neighborhood.name,
      zoning: neighborhood.zoning,
      message: `Neighborhood "${neighborhood.name}" created`
    }
  },

  // ===== GET AVAILABLE PARCELS =====
  getAvailableLand: (neighborhood = null) => {
    let parcels = Object.values(get().landParcels).filter(
      p => p.status === 'available'
    )

    if (neighborhood) {
      parcels = parcels.filter(p => p.neighborhood === neighborhood)
    }

    return parcels.sort((a, b) => a.price - b.price)
  },

  // ===== GET PLAYER LAND =====
  getPlayerLand: (playerId) => {
    const parcelIds = get().playerLand[playerId] || []
    return parcelIds
      .map(id => get().landParcels[id])
      .filter(p => p && p.owner === playerId)
  },

  // ===== GET DEVELOPMENT STATUS =====
  getDevelopmentStatus: (developmentId) => {
    const development = get().developments[developmentId]
    if (!development) return null

    const parcel = Object.values(get().landParcels).find(
      p => p.currentDevelopment === developmentId
    )

    return {
      developmentId: developmentId,
      name: development.name,
      type: development.type,
      location: parcel?.location,
      status: development.status,
      constructionProgress: development.status === 'operational' ? 100 : 60,
      monthlyIncome: development.rentPrice || 0,
      annualMaintenance: development.annualMaintenance
    }
  },

  // ===== NEIGHBORHOOD STATS =====
  getNeighborhoodStats: (neighborhoodId) => {
    const neighborhood = get().masterPlan.neighborhoods[neighborhoodId]
    if (!neighborhood) return null

    const parcels = Object.values(get().landParcels).filter(
      p => p.neighborhood === neighborhood.name
    )
    const developed = parcels.filter(p => p.status === 'developed')
    const available = parcels.filter(p => p.status === 'available')

    return {
      neighborhood: neighborhood.name,
      totalParcels: parcels.length,
      developedParcels: developed.length,
      availableParcels: available.length,
      developmentLevel: neighborhood.developmentLevel,
      averageLandValue: Math.floor(
        parcels.reduce((sum, p) => sum + p.price, 0) / parcels.length
      ),
      amenities: neighborhood.amenities
    }
  }
}))

export function getLandParcelCount() {
  return Object.keys(useLandAndZoningSystem.getState().landParcels).length
}

export function getAllLandParcels() {
  return useLandAndZoningSystem.getState().landParcels
}
