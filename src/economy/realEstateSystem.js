/**
 * VISION STORMS WORLD - Real Estate & Property System
 *
 * Player ownership and property management:
 * - Buy/rent residential properties
 * - Purchase land and develop it
 * - Business property ownership
 * - Property customization and furnishing
 * - Rental income generation
 * - Property appreciation over time
 * - Mortgage/loan system
 * - Property taxes and maintenance
 * - Community real estate marketplace
 *
 * Creates wealth-building mechanics and long-term investment strategies
 */

import { create } from 'zustand'

export const useRealEstateSystem = create((set, get) => ({
  // ===== PROPERTY REGISTRY =====
  properties: {}, // propertyId -> property data
  playerProperties: {}, // playerId -> [propertyIds]
  propertyListings: {}, // active listings for sale/rent
  mortgages: {}, // mortgageId -> mortgage data

  // ===== CREATE PROPERTY LISTING =====
  createPropertyListing: (listingData) => {
    // listingData = {
    //   address, type, bedrooms, bathrooms, sqft, price
    //   description, amenities, location
    // }

    const listingId = `listing_${Date.now()}`

    const listing = {
      id: listingId,
      address: listingData.address,
      type: listingData.type || 'residential', // residential, commercial, land
      bedrooms: listingData.bedrooms || 0,
      bathrooms: listingData.bathrooms || 0,
      squareFeet: listingData.sqft || 0,
      yearBuilt: listingData.yearBuilt || 2026,
      lot: listingData.lot || null,

      // PRICING
      listPrice: listingData.price,
      monthlyRent: listingData.monthlyRent || null,
      propertyTax: Math.floor(listingData.price * 0.012), // ~1.2% annually
      maintenanceCost: Math.floor(listingData.price * 0.01), // ~1% annually

      // FEATURES
      amenities: listingData.amenities || [],
      features: listingData.features || [],
      utilities: listingData.utilities || ['water', 'electric', 'gas'],

      // LOCATION
      location: listingData.location,
      neighborhood: listingData.neighborhood || 'Downtown',
      schoolDistrict: listingData.schoolDistrict || 'District 1',

      // MARKET
      status: 'available', // available, sold, rented, delisted
      listedAt: Date.now(),
      views: 0,
      offers: []
    }

    set(state => ({
      propertyListings: {
        ...state.propertyListings,
        [listingId]: listing
      }
    }))

    return {
      success: true,
      listingId: listingId,
      address: listing.address,
      price: listing.listPrice,
      type: listing.type,
      message: `Property listing created: ${listing.address}`
    }
  },

  // ===== PURCHASE PROPERTY =====
  purchaseProperty: (playerId, listingId, downPayment, mortgageTerm = null) => {
    const listing = get().propertyListings[listingId]
    if (!listing) return { success: false, error: 'Listing not found' }

    if (listing.status !== 'available') {
      return { success: false, error: 'Property is not available' }
    }

    const propertyId = `prop_${playerId}_${Date.now()}`
    const totalPrice = listing.listPrice

    // Create property
    const property = {
      id: propertyId,
      owner: playerId,
      address: listing.address,
      type: listing.type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      squareFeet: listing.squareFeet,
      purchasePrice: totalPrice,
      currentValue: totalPrice,
      purchaseDate: Date.now(),
      furniture: [],
      customizations: [],
      propertyTax: listing.propertyTax,
      maintenanceCost: listing.maintenanceCost,
      rentalIncome: listing.monthlyRent || 0,
      status: 'owned'
    }

    // Handle mortgage if not full payment
    let mortgageId = null
    if (downPayment < totalPrice) {
      mortgageId = `mortgage_${propertyId}`
      const mortgageAmount = totalPrice - downPayment
      const monthlyPayment = calculateMortgagePayment(mortgageAmount, mortgageTerm || 30)

      const mortgage = {
        id: mortgageId,
        propertyId: propertyId,
        playerId: playerId,
        principal: mortgageAmount,
        rate: 0.065, // 6.5% annual
        term: mortgageTerm || 30, // years
        monthlyPayment: monthlyPayment,
        paymentsRemaining: (mortgageTerm || 30) * 12,
        totalInterestPaid: 0,
        status: 'active'
      }

      set(state => ({
        mortgages: {
          ...state.mortgages,
          [mortgageId]: mortgage
        }
      }))
    }

    // Update listings and properties
    set(state => ({
      properties: {
        ...state.properties,
        [propertyId]: property
      },
      playerProperties: {
        ...state.playerProperties,
        [playerId]: [...(state.playerProperties[playerId] || []), propertyId]
      },
      propertyListings: {
        ...state.propertyListings,
        [listingId]: {
          ...listing,
          status: 'sold'
        }
      }
    }))

    return {
      success: true,
      propertyId: propertyId,
      address: property.address,
      purchasePrice: totalPrice,
      downPayment: downPayment,
      mortgageId: mortgageId,
      monthlyPayment: mortgageId
        ? get().mortgages[mortgageId].monthlyPayment
        : 0,
      message: `Congratulations! You've purchased ${property.address}!`,
      propertyDetails: {
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
        monthlyExpenses: property.propertyTax / 12 + property.maintenanceCost / 12
      }
    }
  },

  // ===== RENT PROPERTY =====
  rentProperty: (playerId, listingId, monthlyRent) => {
    const listing = get().propertyListings[listingId]
    if (!listing) return { success: false }

    set(state => ({
      propertyListings: {
        ...state.propertyListings,
        [listingId]: {
          ...listing,
          status: 'rented',
          monthlyRent: monthlyRent
        }
      }
    }))

    return {
      success: true,
      listingId: listingId,
      monthlyRent: monthlyRent,
      annualIncome: monthlyRent * 12,
      message: `Property is now listed for rent at $${monthlyRent}/month`
    }
  },

  // ===== CUSTOMIZE PROPERTY =====
  customizeProperty: (playerId, propertyId, furnishings) => {
    const property = get().properties[propertyId]
    if (!property || property.owner !== playerId) {
      return { success: false, error: 'Property not found or not owned by you' }
    }

    // Calculate cost of furnishings
    const furnishingCost = furnishings.reduce((sum, f) => sum + (f.price || 0), 0)

    const updatedProperty = {
      ...property,
      furniture: furnishings,
      lastCustomized: Date.now()
    }

    set(state => ({
      properties: {
        ...state.properties,
        [propertyId]: updatedProperty
      }
    }))

    return {
      success: true,
      propertyId: propertyId,
      furnishingsAdded: furnishings.length,
      totalCost: furnishingCost,
      message: `Your property at ${property.address} has been customized!`,
      furnishingDetails: furnishings.map(f => ({
        item: f.name,
        cost: f.price,
        rarity: f.rarity
      }))
    }
  },

  // ===== PAY MORTGAGE =====
  payMortgage: (playerId, mortgageId, playerCredits) => {
    const mortgage = get().mortgages[mortgageId]
    if (!mortgage) return { success: false }

    if (playerCredits < mortgage.monthlyPayment) {
      return { success: false, error: 'Insufficient funds for mortgage payment' }
    }

    const updatedMortgage = {
      ...mortgage,
      paymentsRemaining: mortgage.paymentsRemaining - 1,
      totalInterestPaid: mortgage.totalInterestPaid + (mortgage.monthlyPayment * 0.3) // ~30% goes to interest
    }

    // Check if mortgage is paid off
    if (updatedMortgage.paymentsRemaining <= 0) {
      updatedMortgage.status = 'paid_off'
    }

    set(state => ({
      mortgages: {
        ...state.mortgages,
        [mortgageId]: updatedMortgage
      }
    }))

    return {
      success: true,
      mortgageId: mortgageId,
      paymentAmount: mortgage.monthlyPayment,
      paymentsRemaining: updatedMortgage.paymentsRemaining,
      interestPaid: mortgage.monthlyPayment * 0.3,
      principalPaid: mortgage.monthlyPayment * 0.7,
      mortgagePaidOff: updatedMortgage.status === 'paid_off',
      message: `Mortgage payment processed. ${updatedMortgage.paymentsRemaining} payments remaining.`
    }
  },

  // ===== PROPERTY APPRECIATION =====
  appreciateProperties: (playerId) => {
    const propertyIds = get().playerProperties[playerId] || []
    const appreciationRate = 0.03 // 3% annual appreciation

    propertyIds.forEach(propId => {
      const property = get().properties[propId]
      if (property) {
        const newValue = Math.floor(property.currentValue * (1 + appreciationRate))

        set(state => ({
          properties: {
            ...state.properties,
            [propId]: {
              ...property,
              currentValue: newValue
            }
          }
        }))
      }
    })

    return {
      success: true,
      propertiesUpdated: propertyIds.length,
      message: 'Properties have appreciated in value!'
    }
  },

  // ===== SELL PROPERTY =====
  sellProperty: (playerId, propertyId) => {
    const property = get().properties[propertyId]
    if (!property || property.owner !== playerId) {
      return { success: false }
    }

    const salePrice = property.currentValue
    const proceeds = salePrice // In real life, there would be closing costs

    // Remove property from player's portfolio
    set(state => ({
      properties: {
        ...state.properties,
        [propertyId]: {
          ...property,
          status: 'sold'
        }
      },
      playerProperties: {
        ...state.playerProperties,
        [playerId]: (state.playerProperties[playerId] || []).filter(id => id !== propertyId)
      }
    }))

    return {
      success: true,
      propertyId: propertyId,
      salePrice: salePrice,
      proceeds: proceeds,
      capitalGain: salePrice - property.purchasePrice,
      message: `Property sold for $${salePrice}. Proceeds: $${proceeds}`
    }
  },

  // ===== GET PLAYER PROPERTIES =====
  getPlayerProperties: (playerId) => {
    const propertyIds = get().playerProperties[playerId] || []
    return propertyIds
      .map(id => get().properties[id])
      .filter(p => p && p.status === 'owned')
  },

  // ===== GET PROPERTY NET WORTH =====
  getPropertyNetWorth: (playerId) => {
    const properties = get().getPlayerProperties(playerId)
    const totalValue = properties.reduce((sum, p) => sum + p.currentValue, 0)
    const mortgages = Object.values(get().mortgages).filter(m => m.playerId === playerId)
    const mortgageBalance = mortgages.reduce((sum, m) => sum + (m.principal * (m.paymentsRemaining / (m.term * 12))), 0)
    const equity = totalValue - mortgageBalance

    return {
      propertyCount: properties.length,
      totalPropertyValue: totalValue,
      mortgageBalance: mortgageBalance,
      equity: equity,
      rentingProperties: properties.filter(p => p.rentalIncome > 0).length,
      monthlyRentalIncome: properties.reduce((sum, p) => sum + p.rentalIncome, 0)
    }
  },

  // ===== BROWSE LISTINGS =====
  browseListings: (neighborhood = null, type = null) => {
    let listings = Object.values(get().propertyListings)

    if (neighborhood) {
      listings = listings.filter(l => l.neighborhood === neighborhood)
    }

    if (type) {
      listings = listings.filter(l => l.type === type)
    }

    return listings
      .filter(l => l.status === 'available')
      .sort((a, b) => a.listPrice - b.listPrice)
  }
}))

// ===== HELPER FUNCTIONS =====

function calculateMortgagePayment(principal, years) {
  const monthlyRate = 0.065 / 12 // 6.5% annual / 12 months
  const numberOfPayments = years * 12

  if (monthlyRate === 0) return principal / numberOfPayments

  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

  return Math.floor(payment)
}

export function getPropertyCount() {
  return Object.keys(useRealEstateSystem.getState().properties).length
}

export function getAllProperties() {
  return useRealEstateSystem.getState().properties
}
