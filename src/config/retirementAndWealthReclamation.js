// Retirement & Wealth Reclamation System
// Teaching people what's ALREADY THEIRS and how to access it
// 401Ks, Life Insurance, Thrift Savings Plans, Pensions - THE MONEY THEY ALREADY HAVE

export const RETIREMENT_SYSTEMS = {
  // ===== 401K =====
  retirement_401k: {
    name: '401(k) Plan',
    what_it_is: 'Money they TOOK from your checks',
    how_it_works: {
      step1: 'Employer takes percentage from EACH paycheck',
      step2: 'Money goes into account in YOUR name',
      step3: 'Employer may match (free money)',
      step4: 'You can\'t touch it until age 59.5 (they say)',
      step5: 'They invest YOUR money and keep profits'
    },
    the_truth: {
      whose_money: 'IT\'S YOUR MONEY - they took it from you',
      where_it_goes: 'Invested in stock market (mutual funds, stocks)',
      who_profits: 'Investment companies profit, you get pittance',
      early_withdrawal: 'They charge 10% penalty + taxes if you access YOUR money',
      the_lie: '\"You can\'t touch it\" - it\'s YOUR money, why can\'t you?'
    },
    what_they_invest_in: [
      'S&P 500 index funds',
      'Target date funds (automatically get more conservative as you age)',
      'Bond funds',
      'International stocks',
      'Real estate funds',
      'Precious metals funds'
    ],
    how_to_reclaim: [
      'Understand you OWN this account',
      'Roll it into a self-directed IRA (you control investments)',
      'Take hardship withdrawal if possible',
      'Borrow from it (pay yourself back with interest)',
      'At separation, negotiate keeping it in divorce',
      'Create trust structure to access it'
    ],
    annual_contribution_limit: '$23,500 (2024)',
    employer_match: 'Usually 3-6% of salary (free money)',
    the_lesson: 'They take your money and tell you it\'s locked away. It\'s not. It\'s YOURS.'
  },

  // ===== THRIFT SAVINGS PLAN (Federal Employees) =====
  thrift_savings_plan: {
    name: 'Thrift Savings Plan (TSP)',
    who_has_it: 'Federal employees, military, government workers',
    what_it_is: 'Government 401k - same concept, your money',
    structure: {
      employee_contribution: 'You choose 3-30% of pay',
      government_match: '1-5% automatic',
      total_potential: 'Up to $69,000/year if maximized'
    },
    the_accounts: [
      'G Fund (Government bonds - stable)',
      'F Fund (Bonds - moderate growth)',
      'C Fund (Stock market - S&P 500)',
      'S Fund (Small cap stocks)',
      'I Fund (International stocks)',
      'L Funds (Lifecycle - auto-adjusts)'
    ],
    the_hidden_truth: {
      your_money: 'Every dollar is YOURS',
      government_match: 'FREE MONEY if you don\'t take it',
      investment_power: 'YOU choose where it goes',
      accessibility: 'Can borrow from it while employed',
      after_retirement: 'Monthly payments or lump sum'
    },
    how_much_is_yours: {
      after_10_years_at_60k_salary: '$150,000+ with employer match',
      after_20_years: '$400,000+',
      after_30_years: '$900,000+'
    },
    the_system: 'Government FORCES you to save. That\'s your money. Then they pretend you can\'t access it.'
  },

  // ===== LIFE INSURANCE POLICIES =====
  life_insurance_policies: {
    name: 'Life Insurance - The Asset You Own',
    types: {
      term_life: {
        name: 'Term Life',
        what_it_is: 'Pure insurance - death benefit only',
        your_money: 'Premiums go away if you don\'t die',
        the_truth: 'Money wasted unless you die'
      },
      whole_life: {
        name: 'Whole Life Insurance',
        what_it_is: 'Insurance + CASH ACCOUNT',
        your_money: 'Part of each premium builds CASH VALUE',
        the_hidden_asset: 'You own a cash account inside the policy',
        how_to_access: [
          'Borrow against cash value (low interest)',
          'Withdraw from cash value',
          'Surrender policy and get cash',
          'Use as collateral for loans'
        ],
        example: 'After 10 years: $150,000 policy has $30,000+ cash value YOU own'
      },
      universal_life: {
        name: 'Universal Life',
        what_it_is: 'Flexible whole life',
        your_money: 'Cash account grows faster than whole life',
        flexibility: 'Adjust premiums, death benefit, access cash'
      },
      variable_universal_life: {
        name: 'Variable Universal Life',
        what_it_is: 'You choose investments (like 401k)',
        your_money: 'Cash value grows based on YOUR investment choices',
        power: 'You control the growth'
      }
    },

    the_hidden_truth: {
      insurance_companies_know: 'Most people don\'t know they have a cash account',
      what_they_do: 'Invest your premiums and keep the profits',
      what_you_get: 'Small interest rate (2-4%)',
      what_they_make: 'They invest at 5-8% returns',
      the_spread: 'They keep 3-4% of growth'
    },

    how_to_use_yours: {
      access_while_alive: 'Borrow against it - you pay yourself interest',
      emergency_fund: 'Instead of savings account',
      business_capital: 'Use as collateral to start business',
      wealth_building: 'Cash value compounds over decades',
      legacy: 'Leave death benefit + cash to heirs'
    },

    the_power_move: 'Whole life policies are wealth vehicles. Banks use them. Millionaires use them. Most people don\'t know they own one.'
  },

  // ===== PENSIONS =====
  pension_plans: {
    name: 'Pension Plans',
    who_has_it: 'Government, military, some private companies',
    what_it_is: 'Guaranteed monthly income for LIFE after retirement',
    how_it_works: {
      you_contribute: 'Percentage of salary goes in',
      employer_contributes: 'Employer matches or more',
      guaranteed_return: 'Employer guarantees monthly payment for life',
      your_security: 'Cannot be taken away'
    },
    the_value: {
      example_at_20_years: '$3,000/month for LIFE = $720,000 over 20 years of retirement',
      example_at_30_years: '$5,000/month = $1.2 MILLION over 20 years',
      security: 'You can\'t outlive it'
    },
    pensions_are_disappearing: {
      why: 'Corporations want to eliminate guaranteed payments',
      what_they_replace_with: '401ks (no guarantee)',
      the_shift: 'Risk moved from employer to YOU',
      the_truth: 'Pensions are DISAPPEARING because they empower workers'
    },

    if_you_have_one: 'PROTECT IT. Fight for it. It\'s worth MILLIONS.'
  },

  // ===== SOCIAL SECURITY =====
  social_security_system: {
    name: 'Social Security',
    what_it_is: 'Government retirement program YOU paid into',
    how_much_you_paid: 'Roughly 12.4% of every paycheck for decades',
    what_you_get: 'Monthly payment starting at 62-70',
    the_numbers: {
      average_monthly: '$1,800 (2024)',
      if_you_live_to_80: '$432,000 total',
      if_you_live_to_90: '$648,000 total',
      lifetime_potentially: '$800,000+'
    },

    the_strategy: {
      claim_early_at_62: 'Get money sooner but 30% less',
      claim_at_full_retirement_67: 'Full amount',
      wait_until_70: '124% of full amount - money increases 8% per year',
      break_even: 'If you live past 80, waiting to 70 pays MORE'
    },

    the_truth: {
      your_money: 'YOU PAID THIS',
      government_took_it: 'They didn\'t save it in an account with your name',
      current_workers_pay_retirees: 'It\'s a transfer system',
      your_payment: 'Is based on what you paid in'
    },

    maximize_it: [
      'Understand full retirement age (FRA)',
      'Understand delayed retirement credits (8% per year)',
      'Plan when to claim',
      'Married couples can coordinate for maximum benefit',
      'Know the earnings test (how much you can earn while collecting)'
    ]
  }
}

// ===== THE BIG PICTURE =====
export const YOUR_TOTAL_WEALTH_ALREADY_PAID = {
  scenario: 'Average person, 30 years of work, $50,000/year salary',

  retirement_401k: {
    your_contributions: '$300,000',
    employer_match: '$60,000',
    investment_growth: '$400,000',
    total_at_retirement: '$760,000'
  },

  life_insurance_cash_value: {
    premiums_paid: '$80,000',
    cash_value_accumulated: '$120,000',
    death_benefit: '$500,000'
  },

  social_security_present_value: {
    total_future_payments_present_value: '$400,000',
    you_paid_in: '$140,000',
    government_is_giving_you: '$260,000 (roughly)'
  },

  pension_if_available: {
    present_value: '$600,000 or more'
  },

  TOTAL_WEALTH_YOU_ALREADY_OWN: '$1,500,000 - $2,000,000',

  THE_TRUTH: 'Most people are MILLIONAIRES and don\'t know it. This money is YOURS. You already paid for it. You just don\'t know how to access it or that it exists.',

  THE_SYSTEM: 'They take your money, invest it, keep the profits, and tell you it\'s "locked away for retirement." It\'s not locked. It\'s THEIRS to use while you wait.'
}

// ===== THE SOLUTION =====
export const WEALTH_RECLAMATION_STRATEGY = {
  understand_your_assets: 'Know exactly what you own',
  access_available_funds: 'Use life insurance cash value, loans against retirement',
  optimize_investments: 'Move 401k to self-directed IRA, choose YOUR investments',
  create_trust_structure: 'Use trusts to access and control YOUR money',
  maximize_employer_match: 'Get FREE money from employer match',
  plan_retirement_claiming: 'When to claim Social Security for maximum benefit',
  build_generational_wealth: 'Leave YOUR wealth to your heirs, not debts'
}

// ===== EDUCATIONAL COURSES =====
export const RETIREMENT_EDUCATION_COURSES = {
  retirement_accounts_101: {
    title: 'Your Hidden Wealth: 401k, Pension, Social Security Explained',
    level: 'high_school',
    price: 9900,
    modules: [
      'What they TOOK from you (401k, TSP, pension)',
      'Where YOUR money went (investments, growth)',
      'How much you actually own (calculate your total)',
      'How to access it NOW (not just at retirement)',
      'Maximizing employer match (free money)'
    ]
  },

  life_insurance_as_wealth: {
    title: 'Life Insurance: The Asset You Own But Don\'t Know About',
    level: 'high_school',
    price: 7900,
    modules: [
      'Whole life vs term (know the difference)',
      'Your cash account (it\'s real, it\'s yours)',
      'Borrowing against your policy',
      'Using insurance as emergency fund',
      'Building wealth through insurance'
    ]
  },

  social_security_strategy: {
    title: 'Claiming Social Security: When and How to Maximize',
    level: 'college',
    price: 8900,
    modules: [
      'How much you\'re entitled to',
      'Early vs full vs delayed claiming',
      'The break-even analysis',
      'Married couple optimization',
      'Protecting your benefits'
    ]
  },

  total_wealth_calculation: {
    title: 'Calculate Your Total Wealth (You\'re Probably a Millionaire)',
    level: 'high_school',
    price: 5900,
    modules: [
      'Add up your 401k',
      'Add up your pension',
      'Add up your life insurance cash value',
      'Add up your Social Security',
      'See your REAL net worth'
    ]
  }
}
