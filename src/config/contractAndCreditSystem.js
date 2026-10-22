// Contract & Credit System
// Mapping EVERY financial contract and showing WHERE it goes and HOW it creates credit
// This is the PAPERWORK TRAIL that builds the system of control

export const MAJOR_FINANCIAL_CONTRACTS = {
  // ===== AUTO LOAN =====
  auto_loan: {
    transaction: 'Buying a car with a loan',
    forms_involved: {
      application: {
        name: 'Auto Loan Application',
        what_it_contains: [
          'Your name, SSN, address',
          'Employment info',
          'Income verification',
          'Credit history authorization',
          'Vehicle details'
        ],
        filled_out_by: 'You (customer)',
        collected_by: 'Dealership or bank'
      },
      promissory_note: {
        name: 'Promissory Note',
        what_it_says: 'You PROMISE to pay back the loan with interest',
        legal_binding: 'Legally binding contract',
        contains: [
          'Amount borrowed',
          'Interest rate',
          'Monthly payment amount',
          'Due date',
          'Penalty for non-payment'
        ],
        the_trick: 'Signed under duress (you want the car, so you sign)',
        power_dynamic: 'Bank holds the title, you hold the debt'
      },
      security_agreement: {
        name: 'Security Agreement / UCC-1 Filing',
        what_it_does: 'Bank takes lien on the car',
        meaning: 'Car is collateral for the loan',
        your_rights: 'You can\'t sell it without paying off loan',
        their_rights: 'They can repossess it if you miss payments'
      }
    },

    where_documents_go: {
      application: 'Bank keeps copy, may sell to credit bureau',
      promissory_note: 'Bank keeps original (legal evidence)',
      security_agreement: 'Filed with state (UCC filing)',
      title: 'Bank holds title in their name (security)',
      your_copy: 'You get copies (not originals)'
    },

    credit_impact: {
      hard_inquiry: 'Bank checks credit (lowers score 5-10 points)',
      new_account: 'Creates new loan account (lowers score temporarily)',
      payment_history: 'On-time payments build good credit',
      utilization: 'Using credit shows you\'re creditworthy',
      age_of_account: 'Older accounts build credit history'
    },

    how_credit_bureaus_know: {
      reporting: 'Bank reports monthly payments to credit bureaus',
      bureaus: 'Equifax, Experian, TransUnion',
      what_they_track: 'Amount owed, payment history, late payments',
      how_long: 'Account stays on report 7 years after closed'
    },

    total_forms_created: 6,
    total_entities_involved: 'Dealership, bank, state DMV, 3 credit bureaus'
  },

  // ===== MORTGAGE (HOUSE LOAN) =====
  mortgage_loan: {
    transaction: 'Buying a house with a mortgage',
    the_biggest_contract: 'Most expensive and complex',

    forms_involved: {
      application_form_1003: {
        name: 'Uniform Residential Loan Application (Form 1003)',
        official_document: 'Federal standard form',
        what_it_contains: [
          'Personal info (name, SSN, address, employment)',
          'Financial info (assets, liabilities, income)',
          'Property details',
          'Loan type and amount',
          'Employment verification authorization',
          'Credit check authorization'
        ],
        purpose: 'Bank decides if you qualify',
        who_sees_it: 'Lender, underwriter, credit bureaus, mortgage insurers'
      },

      credit_report_authorization: {
        name: 'Credit Report Authorization',
        what_it_allows: 'Bank to pull your credit from 3 bureaus',
        impact: 'Hard inquiry on your credit',
        the_trace: 'Banks share your report with other banks'
      },

      employment_verification: {
        name: 'Employment Verification Form (4506-C)',
        what_it_does: 'Bank verifies you actually have the job',
        who_receives_it: 'Your employer directly from IRS',
        privacy_concern: 'Bank contacts your boss about your income'
      },

      appraisal_order: {
        name: 'Property Appraisal',
        what_it_is: 'Independent appraiser values the property',
        who_pays: 'You (buyer) pay for appraisal (~$500)',
        the_catch: 'Appraisal is bank\'s property, you don\'t own it'
      },

      title_search_and_insurance: {
        name: 'Title Search & Title Insurance',
        what_it_does: 'Ensures no one else claims ownership',
        who_does_it: 'Title company',
        who_pays: 'Varies (you or seller)',
        insurance_cost: '0.5-1% of home price'
      },

      promissory_note: {
        name: 'Promissory Note (Mortgage Note)',
        what_it_says: 'You PROMISE to repay the mortgage debt',
        amount: 'Home price minus down payment',
        interest: '4-7% (30 years)',
        monthly_payment: 'Mortgage + taxes + insurance (PITI)',
        the_trap: 'You promise to pay 30 YEARS of debt on THEIR terms'
      },

      deed_of_trust_or_mortgage: {
        name: 'Deed of Trust / Mortgage',
        what_it_does: 'Bank takes lien on your house',
        meaning: 'House is collateral',
        your_understanding: 'You own the house',
        legal_reality: 'Bank has interest in house until loan paid off',
        their_power: 'They can foreclose if you miss payments'
      },

      disclosure_forms: {
        name: 'Disclosure Forms (numerous)',
        includes: [
          'Truth in Lending (TILA) Disclosure',
          'Initial Escrow Disclosure',
          'Servicing Disclosure',
          'Fair Credit Reporting Act Notice',
          'Privacy Notice'
        ],
        what_they_do: 'Inform you of your rights (in tiny print)',
        reality: 'Most people don\'t read them'
      },

      closing_disclosure: {
        name: 'Closing Disclosure (CD)',
        what_it_shows: 'Final loan terms and costs',
        timing: 'Must be given 3 days before closing',
        your_rights: 'Can walk away if terms changed',
        reality: 'Most people don\'t walk away at this point'
      },

      deed: {
        name: 'Deed',
        what_it_transfers: 'Ownership of property to you',
        when_signed: 'At closing',
        recorded_where: 'County recorder\'s office',
        public_record: 'Everyone can see you own this property'
      }
    },

    where_documents_go: {
      original_promissory_note: 'Bank keeps (most valuable document)',
      deed_of_trust: 'Recorded at county recorder',
      deed: 'Recorded at county recorder (public)',
      appraisal: 'Bank keeps (may never show you)',
      application_1003: 'Bank keeps, may sell to mortgage companies',
      disclosures: 'You get copies (3-day review period)'
    },

    credit_impact: {
      hard_inquiry: 'Multiple banks may pull credit (multiple inquiries)',
      new_account: 'Creates mortgage account (largest credit account)',
      credit_utilization: 'Using large credit amount actually helps score',
      payment_history: '30 years of on-time payments build massive credit',
      age_of_account: 'Oldest account on report (very valuable for score)'
    },

    how_credit_bureaus_know: {
      reporting: 'Mortgage company reports monthly to credit bureaus',
      what_tracked: 'Balance owed, payment history, late payments',
      lender_identification: 'What bank is financing shown on report',
      loan_type: 'Shows as mortgage (better than credit card)',
      duration: 'Stays on report 7 years after paid off'
    },

    the_paperwork_reality: {
      total_pages_signed: '50-100+ pages',
      total_documents_created: '15-20+ individual forms',
      total_entities_involved: 'Bank, appraiser, title company, county recorder, 3 credit bureaus, mortgage servicer',
      what_you_own: 'Equity in house',
      what_bank_owns: 'Lien on house, your monthly payments for 30 years',
      what_you_receive: 'Deed, appraisal copy, copies of disclosures'
    },

    total_cost_breakdown: {
      home_price: '$300,000',
      down_payment: '$60,000 (20%)',
      loan_amount: '$240,000',
      interest_over_30_years: '$172,000',
      taxes_over_30_years: '$130,000',
      insurance_over_30_years: '$60,000',
      total_cost: '$602,000',
      what_you_get: 'A house you could have bought for $300,000'
    }
  },

  // ===== CREDIT CARD =====
  credit_card: {
    transaction: 'Opening and using a credit card',
    the_simplest: 'But the most predatory',

    forms: {
      application: {
        name: 'Credit Card Application',
        what_they_collect: [
          'Name, SSN, address',
          'Income (what you report)',
          'Employment',
          'Credit authorization'
        ]
      },
      cardmember_agreement: {
        name: 'Cardmember Agreement',
        what_it_contains: [
          'Interest rate (APR)',
          'Annual fees',
          'Late fees',
          'Over limit fees',
          'Default terms',
          'Terms of service (50+ pages)'
        ],
        the_reality: 'You don\'t read it, they know you don\'t'
      }
    },

    where_documents_go: {
      application: 'Card company keeps, credit check sent to bureaus',
      agreement: 'They keep, you get copy (which you don\'t read)'
    },

    credit_impact: {
      hard_inquiry: 'Card company pulls credit (5-10 point hit)',
      new_account: 'New credit card account created',
      credit_utilization: 'Available credit shows on report',
      late_payments: 'One late payment: 100+ point hit for years',
      collection: 'Charge-off leads to collections (7-year mark)'
    },

    the_predatory_cycle: {
      step1: 'Card company offers low intro APR',
      step2: 'You use card and think you\'re building credit',
      step3: 'Intro period ends, APR jumps to 18-25%',
      step4: 'Minimum payments don\'t cover interest',
      step5: 'Balance grows despite payments',
      step6: 'You carry balance and pay interest for years',
      step7: 'Card company profits massively'
    }
  },

  // ===== INSURANCE APPLICATIONS =====
  insurance_applications: {
    health_insurance: {
      forms: ['Application Form', 'W4 (employer withholding)', 'Beneficiary Form'],
      where_goes: 'Insurance company, employer, credit bureaus'
    },
    life_insurance: {
      forms: ['Application', 'Medical Exam Authorization', 'Financial Disclosure'],
      where_goes: 'Insurance company, medical records companies'
    },
    auto_insurance: {
      forms: ['Application', 'Driver License Copy', 'Vehicle Registration'],
      where_goes: 'Insurance company, state DMV, credit bureaus (sometimes)'
    },
    homeowners_insurance: {
      forms: ['Application', 'Property Description', 'Loss History'],
      where_goes: 'Insurance company, mortgage lender, credit bureaus'
    }
  },

  // ===== APARTMENT LEASE =====
  apartment_lease: {
    transaction: 'Renting an apartment',
    forms: {
      rental_application: {
        name: 'Rental Application',
        what_they_collect: [
          'Name, SSN, address history',
          'Employment verification',
          'Income proof',
          'References (personal and professional)',
          'Authorization for credit check'
        ],
        the_check: 'Landlord pulls credit and background'
      },
      lease_agreement: {
        name: 'Lease',
        what_it_is: 'Contract with landlord for 12 months',
        contains: [
          'Monthly rent amount',
          'Late fees',
          'Deposit amount',
          'Rules and restrictions',
          'Eviction terms'
        ]
      }
    },

    where_documents_go: {
      application: 'Landlord keeps, credit company gets authorization',
      lease: 'Landlord keeps original, you get copy'
    },

    credit_impact: {
      not_typically_reported: 'On-time rent payments usually NOT reported',
      if_late: 'Late payments can go to collections',
      eviction: 'Eviction becomes public record (7 years)',
      the_unfairness: 'Pay rent on time = no credit benefit, Miss once = credit destroyed'
    }
  },

  // ===== STUDENT LOANS =====
  student_loans: {
    forms: {
      fafsa: {
        name: 'FAFSA (Free Application for Federal Student Aid)',
        what_it_contains: [
          'Full financial disclosure',
          'Income, assets, family situation',
          'Authorization for IRS to verify income',
          'Employment status'
        ]
      },
      loan_agreement: {
        name: 'Student Loan Agreement',
        contains: [
          'Loan amount',
          'Interest rate',
          'Repayment terms (10-25 years)',
          'Forbearance options',
          'Forgiveness programs'
        ]
      }
    },

    where_documents_go: {
      fafsa: 'Federal government, school, credit bureaus',
      loan: 'Loan servicer (government or private)'
    },

    credit_impact: {
      new_account: 'Student loan account created',
      large_balance: 'Large debt on credit report',
      payment_history: 'Monthly payments show on report',
      default: 'Defaulting on student loans is severe (10-year hit)'
    },

    the_trap: 'Most people don\'t understand student loans. Debt follows you forever.'
  }
}

// ===== HOW CREDIT BUREAUS BUILD YOUR FILE =====
export const CREDIT_BUREAU_MECHANICS = {
  the_three_bureaus: {
    equifax: 'Largest, oldest, most data',
    experian: 'Merged with TRW',
    transunion: 'Tracks alternative data (rent, utilities)'
  },

  how_they_get_information: {
    creditors_report: 'Every creditor reports to bureaus monthly',
    what_reported: [
      'Account type (credit card, mortgage, auto, student loan)',
      'Balance owed',
      'Credit limit',
      'Payment history (on-time, 30 late, 60 late, 90 late, charged-off)',
      'Date account opened',
      'Inquiries (hard and soft)'
    ],
    public_records: 'Court records: judgments, liens, foreclosures, bankruptcies',
    fraud_victims: 'Identity theft reports'
  },

  credit_score_factors: {
    payment_history_35: 'On-time vs late vs missed payments',
    amounts_owed_30: 'Total debt and utilization ratio',
    length_of_history_15: 'How long you\'ve had credit',
    credit_mix_10: 'Different types of credit',
    new_credit_10: 'Recent inquiries and new accounts'
  },

  the_score_power: {
    300_score: 'Very poor, high risk',
    600_score: 'Poor, won\'t get approved',
    700_score: 'Good, can get loans',
    750_score: 'Very good, best rates',
    850_score: 'Perfect, rarely achieved'
  },

  the_system: 'Credit bureaus build a FILE on you from hundreds of sources. They then SELL this information to lenders. You pay for this system through higher interest rates.'
}

// ===== HOW TO DISPUTE & REMOVE =====
export const CREDIT_REPAIR_STRATEGY = {
  get_your_reports: 'Free report from annualcreditreport.com (federal requirement)',
  review_carefully: 'Look for errors, inaccuracies, fraud',
  dispute_process: {
    step1: 'Write to credit bureau with dispute',
    step2: 'Bureau has 30 days to verify',
    step3: 'If not verified, must be removed',
    step4: 'If removed, score improves'
  },

  common_errors: [
    'Accounts in wrong name',
    'Duplicate accounts',
    'Wrong account status (open vs closed)',
    'Wrong balance amounts',
    'Wrong late payment dates',
    'Accounts that belong to someone else (identity theft)'
  ],

  legal_tools: {
    fcra: 'Fair Credit Reporting Act (FCRA) - your rights',
    cease_and_desist: 'Stop debt collectors from calling',
    validation_letter: 'Demand debt verification from collection agency'
  }
}

export const EDUCATIONAL_COURSES_CONTRACTS = {
  contracts_101: {
    title: 'Contracts Decoded: What You\'re Really Signing',
    level: 'high_school',
    price: 9900,
    modules: [
      'Auto loan contracts - the promissory note trap',
      'Mortgage contracts - 30 years of debt explained',
      'Credit card agreements - predatory terms exposed',
      'Lease agreements - your tenant rights',
      'What to read, what to negotiate'
    ]
  },

  credit_system_exposed: {
    title: 'The Credit System: How It Builds, How It Destroys',
    level: 'college',
    price: 12900,
    modules: [
      'How credit bureaus collect your data',
      'How credit scores are calculated',
      'How banks use credit scores against you',
      'Disputing inaccuracies on your report',
      'Building credit the right way'
    ]
  },

  paperwork_trail: {
    title: 'Follow the Paperwork: Where Your Contracts Go',
    level: 'high_school',
    price: 8900,
    modules: [
      'Auto loan: 6 forms, 4 entities',
      'Mortgage: 15+ forms, 10+ entities',
      'Credit card: 2 forms, massive exposure',
      'Insurance: What they really know',
      'Public records: What\'s about you'
    ]
  }
}
