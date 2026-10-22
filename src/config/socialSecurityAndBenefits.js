// Social Security & Government Benefits System
// Disability, Food Assistance, How to Maximize What's Already Yours

export const SOCIAL_SECURITY_DISABILITY = {
  ssdi_basics: {
    name: 'Social Security Disability Insurance (SSDI)',
    who_gets_it: 'People with disabilities (physical, mental, developmental)',
    requirement: 'Don\'t have to work history (children can qualify)',
    current_payment: '$900-$1,800 average monthly',
    the_problem: '$900/month ain\'t living. That\'s barely covering rent in most places.',

    the_truth: {
      they_have_money: 'If they can pay EVERYONE disability, they got money',
      why_so_little: 'System is designed to keep people dependent and poor',
      greedy_system: 'They keep the rest and give crumbs to disabled people',
      proof_of_money: 'Social Security has a $2.8 TRILLION trust fund'
    },

    how_to_qualify: {
      medical_requirements: [
        'Severe impairment (physical or mental)',
        'Expected to last 12+ months or result in death',
        'Must prevent substantial gainful activity',
        'Social Security determines (they approve ~30% initially)'
      ],
      work_history_NOT_required: 'Child, young adult with disability can get it without working',
      family_benefits: 'Family members can get benefits on your account',
      spouse_benefits: 'Spouse can get benefits at 62 or any age caring for child <16'
    },

    current_monthly_amounts: {
      average_disabled_worker: '$1,550',
      average_child_on_parents_account: '$800',
      spouse_at_62: '$850',
      note: 'These amounts are INSULTINGLY LOW for cost of living'
    },

    work_incentives_hidden: {
      trial_work_period: '9 months earning ANY amount without losing benefits',
      extended_eligibility: '36 months after trial work period where you can test earning ability',
      impairment_related_work_expenses: 'Work expenses related to disability are deductible',
      subsidies_and_support: 'Vocational rehabilitation, job coaching',
      plan_to_achieve_self_support: 'Can exclude certain income/resources when calculating benefits',
      the_secret: 'You CAN work while on SSDI if you know the rules'
    },

    how_to_increase_benefits: {
      work_record_if_applicable: 'Each year you work adds to your record (even while on SSDI)',
      family_members: 'More family members = more total household benefits',
      supplemental_security_income: 'SSI adds to SSDI if resources are low',
      state_supplements: 'Some states add money to federal SSDI',
      rep_payee_access: 'Representative payee can help manage and maximize benefits'
    },

    the_system: 'Government gives disability but barely enough to live. Then teaches people not to work (lose benefits). Keeps people trapped and dependent.'
  },

  supplemental_security_income: {
    name: 'Supplemental Security Income (SSI)',
    purpose: 'Tops up income for elderly, blind, disabled with few resources',
    current_payment: '$914/month individual, $1,371 couple',
    qualifications: [
      'Age 65+, blind, or disabled',
      'Limited income (<$914/month)',
      'Limited resources (<$2,000 individual)'
    ],

    what_counts_as_resources: [
      'Bank accounts',
      'Stocks, bonds',
      'Real estate (except primary home)',
      'Vehicles (except primary car)',
      'Property for sale'
    ],

    what_DOESN\'T_count: [
      'Primary home',
      'Primary car',
      'Household goods and personal effects',
      'Life insurance policy (if face value <$1,500)',
      'Wedding ring',
      'Certain disability-related items'
    ],

    the_strategy: 'Structure assets so they don\'t count against SSI limits (life insurance, home ownership, items classified as "non-countable")'
  }
}

export const SNAP_AND_FOOD_ASSISTANCE = {
  snap_program: {
    name: 'SNAP (Supplemental Nutrition Assistance Program, formerly Food Stamps)',
    what_it_does: 'Monthly food benefits (sent on EBT card)',
    current_benefits: {
      individual: '$281/month',
      family_of_4: '$1,039/month',
      elderly_disabled_couples: 'May qualify for more'
    },

    income_limits: {
      individual_130_percent: '<$1,868/month',
      family_of_4_130_percent: '<$3,852/month',
      note: 'These limits vary by state'
    },

    how_to_apply: [
      'Apply at state SNAP agency',
      'Online, mail, phone, or in person',
      'Need: ID, proof of residency, income documentation, SSN',
      'Process: Usually 30 days, may be faster'
    ],

    what_it_covers: [
      'Fruits and vegetables',
      'Grains and bread',
      'Meat, poultry, fish',
      'Dairy',
      'Snacks and non-alcoholic beverages'
    ],

    what_it_DOESN\'T_cover: [
      'Hot food',
      'Alcohol and tobacco',
      'Vitamins and medicines',
      'Pet food',
      'Paper products'
    ],

    maximize_benefits: {
      household_composition: 'More people = more benefits',
      shelter_deduction: 'High rent/mortgage = higher benefits',
      utility_allowance: 'Heating/cooling costs can increase benefits',
      child_support_paid: 'Increases benefit amount',
      medical_expenses_elderly: 'If elderly or disabled'
    }
  },

  wic_program: {
    name: 'WIC (Women, Infants, and Children)',
    who_qualifies: 'Pregnant women, breastfeeding, children <5, nutrition risk',
    income_limit: '185% of federal poverty line',
    what_it_provides: [
      'Specific nutritious foods (milk, cereal, eggs, etc.)',
      'Nutrition education',
      'Breastfeeding support',
      'Referrals to health services'
    ]
  },

  other_assistance: {
    liheap: {
      name: 'LIHEAP (Low Income Home Energy Assistance)',
      what: 'Help paying heating/cooling costs'
    },
    calfresh: {
      name: 'CalFresh (CA SNAP)',
      what: 'California\'s food assistance program'
    }
  }
}

export const LIFE_INSURANCE_MAXIMIZATION = {
  whole_life_strategy: {
    name: 'Using Whole Life as Wealth Vehicle',
    how_it_works: [
      'Monthly premium funds insurance + cash account',
      'Cash account grows at 2-4% guaranteed',
      'Can borrow against cash value at low rates',
      'Borrow to fund other investments'
    ],

    wealth_building_example: {
      age_35_buys_policy: '$300,000 death benefit',
      monthly_premium: '$400',
      after_10_years: '$50,000 cash value accumulated',
      borrow_at_4_percent: 'Invest $50,000 at 8% = $4,000/year profit',
      spread: 'You profit 4% ($2,000/year) on their money'
    },

    the_secret: 'Banks and wealthy people use whole life insurance. Most poor people don\'t know about it.'
  },

  policy_benefits: {
    living_benefits: [
      'Borrow for emergencies',
      'Borrow for business',
      'Borrow to pay college',
      'No credit check needed',
      'No approval process'
    ],
    death_benefits: [
      'Tax-free to beneficiaries',
      'Pays off debts',
      'Leaves inheritance',
      'Bypasses probate'
    ]
  }
}

export const DISABILITY_AND_WORK_PLANNING = {
  the_problem: 'SSDI gives ~$1,550/month. Work incentives let you earn MORE while keeping most benefits. Most people don\'t know this.',

  work_scenarios: {
    scenario_1_dont_work: {
      monthly_benefit: '$1,550',
      total_annual: '$18,600',
      problem: 'Can\'t live on this'
    },
    scenario_2_work_and_know_rules: {
      ssdi_benefit: '$1,550',
      wages_earned: '$1,500/month (trial work period)',
      total_monthly: '$3,050',
      total_annual: '$36,600',
      note: 'After trial work, continued work incentives apply'
    },
    scenario_3_maximize_family: {
      your_ssdi: '$1,550',
      spouse_benefit: '$775',
      child_benefit: '$775',
      total_monthly: '$3,100',
      total_annual: '$37,200'
    }
  },

  education_needed: 'People on SSDI need financial coaching to maximize benefits legally without losing them'
}

export const EDUCATIONAL_COURSES_BENEFITS = {
  ssdi_101: {
    title: 'Social Security Disability: Getting What\'s Yours',
    level: 'high_school',
    price: 7900,
    modules: [
      'How SSDI works and who qualifies',
      'Current benefit amounts and why they\'re too low',
      'Work incentives - you CAN work while on SSDI',
      'How to maximize through family members',
      'Protecting your benefits'
    ]
  },

  snap_wic_assistance: {
    title: 'Food Assistance Programs: Getting Maximum Benefits',
    level: 'high_school',
    price: 5900,
    modules: [
      'SNAP application and qualification',
      'Maximizing SNAP through household structure',
      'What SNAP covers and how to stretch it',
      'WIC benefits for families with children',
      'Other assistance programs (LIHEAP, etc.)'
    ]
  },

  life_insurance_wealth: {
    title: 'Life Insurance as Wealth Building Tool',
    level: 'college',
    price: 8900,
    modules: [
      'Whole life insurance for wealth, not just death',
      'Cash value: what it is, how to use it',
      'Borrowing against your policy',
      'Using insurance as emergency capital',
      'Banks use this - you should too'
    ]
  }
}
