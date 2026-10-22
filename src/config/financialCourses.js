// Financial Education - Interest Rates, Compound Interest, Banking, Taxes, Trademarks

export const FINANCIAL_COURSES = {
  // ===== COMPOUND INTEREST COURSES =====
  interest_basics_101: {
    id: 'interest_basics_101',
    title: 'Understanding Interest Rates',
    level: 'high_school',
    category: 'finance',
    duration: 3,
    price: 7900,
    instructor: 'Finance Teacher NPC',
    description: 'Learn how interest rates work and affect your money',
    modules: [
      {
        id: 'module_1',
        title: 'What is Interest?',
        content: 'Interest is the cost of borrowing money or the reward for saving',
        lessons: [
          'Principal (original amount)',
          'Interest rate (percentage)',
          'Time period (months/years)',
          'How banks calculate interest'
        ]
      },
      {
        id: 'module_2',
        title: 'Simple Interest vs Compound Interest',
        content: 'Understanding the difference that changes your financial life',
        lessons: [
          'Simple: Interest on principal only',
          'Compound: Interest on interest too',
          'Why compound is more powerful',
          'Real-world examples'
        ]
      },
      {
        id: 'module_3',
        title: 'Interest Rate Scenarios',
        content: 'See how different rates affect your money over time',
        scenarios: [
          { principal: 1000, rate: 2, years: 10, type: 'savings' },
          { principal: 1000, rate: 5, years: 10, type: 'savings' },
          { principal: 1000, rate: 10, years: 10, type: 'savings' }
        ]
      }
    ]
  },

  compound_interest_201: {
    id: 'compound_interest_201',
    title: 'Compound Interest - The 8th Wonder',
    level: 'college',
    category: 'finance',
    duration: 5,
    price: 14900,
    instructor: 'Trinity Reign',
    description: 'Master compound interest and how it builds wealth',
    modules: [
      {
        id: 'module_1',
        title: 'How Compound Interest Works',
        lessons: [
          'Interest earns interest',
          'Exponential growth over time',
          'The magic of time',
          'Starting early matters'
        ]
      },
      {
        id: 'module_2',
        title: 'Daily Compound Interest',
        lessons: [
          'Interest compounds daily',
          'More frequent = faster growth',
          'Real banking calculations',
          'Your daily wealth building'
        ],
        scenarios: [
          {
            name: '$10,000 at 5% compounded daily for 5 years',
            principal: 10000,
            rate: 5,
            years: 5,
            compounding: 'daily',
            result: 12833
          },
          {
            name: '$10,000 at 5% compounded yearly for 5 years',
            principal: 10000,
            rate: 5,
            years: 5,
            compounding: 'yearly',
            result: 12763
          },
          {
            name: '$50,000 at 4% compounded daily for 20 years',
            principal: 50000,
            rate: 4,
            years: 20,
            compounding: 'daily',
            result: 110647
          }
        ]
      },
      {
        id: 'module_3',
        title: 'Real-Life Scenarios',
        scenarios: [
          {
            title: 'Start saving at 20 vs 30',
            description: 'Why 10 years earlier changes EVERYTHING',
            example: '$200/month from age 20 at 7% = $1.1M at 65, vs $200/month from age 30 = $650K'
          },
          {
            title: 'Credit Card Debt Compound Interest',
            description: 'How debt grows against you',
            example: '$5000 at 18% APR compounding monthly = $20,000+ in 5 years if you only pay minimum'
          },
          {
            title: 'Investment Growth',
            description: 'How to build generational wealth',
            example: '$10K invested at age 25, 8% growth, untouched to 65 = $621K'
          }
        ]
      },
      {
        id: 'module_4',
        title: 'Wealth Building Strategy',
        lessons: [
          'Time is your greatest asset',
          'Start NOW, not later',
          'Small amounts grow BIG',
          'Consistency matters more than amount',
          'Let compound interest work for you'
        ]
      }
    ]
  },

  // ===== BANKING SYSTEM COURSES =====
  how_banks_work_101: {
    id: 'how_banks_work_101',
    title: 'How Banks Work & Where Money Comes From',
    level: 'high_school',
    category: 'finance',
    duration: 4,
    price: 9900,
    instructor: 'Bank Manager NPC',
    description: 'Understand the banking system and how banks make money',
    modules: [
      {
        id: 'module_1',
        title: 'Where Banks Get Their Money',
        lessons: [
          'Deposits from customers (your savings)',
          'Loans from other banks',
          'Central bank (Federal Reserve)',
          'Investment and reserves',
          'How banks pool your money'
        ]
      },
      {
        id: 'module_2',
        title: 'How Banks Lend Money',
        lessons: [
          'Reserve requirements',
          'Fractional banking (lending more than they have)',
          'Interest on loans',
          'Risk assessment',
          'Collateral requirements'
        ]
      },
      {
        id: 'module_3',
        title: 'Bank Revenue Model',
        lessons: [
          'Interest difference (borrow at 2%, lend at 7%)',
          'Fees and charges',
          'Investment income',
          'Why banks need your deposits',
          'FDIC insurance and protection'
        ]
      },
      {
        id: 'module_4',
        title: 'Your Money in the Bank',
        lessons: [
          'FDIC protection ($250K coverage)',
          'Where your deposits go',
          'Interest you earn',
          'How to maximize bank benefits',
          'Safe banking practices'
        ]
      }
    ]
  },

  // ===== TAX EDUCATION COURSES =====
  taxes_deductions_201: {
    id: 'taxes_deductions_201',
    title: 'Taxes, Deductions & Getting Money Back',
    level: 'high_school',
    category: 'finance',
    duration: 5,
    price: 12900,
    instructor: 'CPA NPC',
    description: 'Master taxes and learn what you can get back',
    modules: [
      {
        id: 'module_1',
        title: 'Understanding Taxes',
        lessons: [
          'Federal income tax',
          'State income tax',
          'FICA (Social Security & Medicare)',
          'Tax brackets and rates',
          'How your taxes are calculated'
        ]
      },
      {
        id: 'module_2',
        title: 'Deductions Explained',
        lessons: [
          'Standard deduction ($13,850)',
          'Itemized deductions',
          'Business expenses',
          'Home office deduction',
          'Charitable donations',
          'Medical expenses',
          'Education expenses'
        ]
      },
      {
        id: 'module_3',
        title: 'Keep Every Receipt!',
        lessons: [
          'Why receipts matter',
          'What expenses are deductible',
          'How to organize receipts',
          'Digital tracking systems',
          'What the IRS allows',
          'Audit protection'
        ]
      },
      {
        id: 'module_4',
        title: 'Get Money Back from Taxes',
        lessons: [
          'Tax refunds explained',
          'Withholding vs actual taxes',
          'Tax credits (child, education, earned income)',
          'How to maximize returns',
          'Filing correctly'
        ]
      },
      {
        id: 'module_5',
        title: 'Self-Employment Taxes',
        lessons: [
          'If you own a business',
          'Quarterly estimated taxes',
          'Self-employment tax (15.3%)',
          'Deductions for business owners',
          'Track EVERYTHING'
        ]
      }
    ]
  },

  // ===== TRADEMARK & BUSINESS LAW =====
  trademark_basics_150: {
    id: 'trademark_basics_150',
    title: 'Trademark Your Name & Brand',
    level: 'high_school',
    category: 'business_law',
    duration: 3,
    price: 8900,
    instructor: 'IP Lawyer NPC',
    description: 'Learn how to trademark your name and protect your brand',
    modules: [
      {
        id: 'module_1',
        title: 'What is a Trademark?',
        lessons: [
          'Trademark vs copyright vs patent',
          'Name protection',
          'Logo protection',
          'Slogan/phrase protection',
          'Why it matters'
        ]
      },
      {
        id: 'module_2',
        title: 'How Trademarks Work',
        lessons: [
          'Common law trademark (using it)',
          'Registered trademark (™ vs ®)',
          'Federal registration ($250-$400)',
          'State registration',
          'Duration of protection'
        ]
      },
      {
        id: 'module_3',
        title: 'Trademarking Your Name',
        lessons: [
          'Why creators trademark their names',
          'Protects your brand value',
          'Prevents others from using it',
          'Legal enforcement power',
          'Commerce and business'
        ]
      },
      {
        id: 'module_4',
        title: 'The Power of Trademarks',
        lessons: [
          'Builds brand value',
          'Creates business assets',
          'Licensing opportunities',
          'Protecting from counterfeit',
          'International protection',
          'Generational wealth building'
        ]
      }
    ]
  },

  // ===== CREDIT & DEBT COURSES =====
  credit_debt_301: {
    id: 'credit_debt_301',
    title: 'Credit Scores, Debt & Financial Freedom',
    level: 'college',
    category: 'finance',
    duration: 6,
    price: 16900,
    instructor: 'Financial Advisor NPC',
    description: 'Master credit and eliminate debt for true freedom',
    modules: [
      {
        id: 'module_1',
        title: 'Credit Scores Explained',
        lessons: [
          'What is a credit score (300-850)',
          'Components: payment history, debt, age, inquiries',
          'Why scores matter',
          'Checking your score',
          'Improving your score'
        ]
      },
      {
        id: 'module_2',
        title: 'Debt Types & Interest',
        lessons: [
          'Good debt (mortgage, education)',
          'Bad debt (credit cards, payday)',
          'Debt-to-income ratio',
          'Interest rates and terms',
          'Impact on your future'
        ]
      },
      {
        id: 'module_3',
        title: 'Getting Out of Debt',
        lessons: [
          'Debt avalanche method',
          'Debt snowball method',
          'Negotiating with creditors',
          'Settlement options',
          'Bankruptcy as last resort'
        ]
      },
      {
        id: 'module_4',
        title: 'Building Wealth Instead',
        lessons: [
          'Live below your means',
          'Emergency fund (6 months)',
          'Invest while debt-free',
          'Compound interest advantage',
          'Financial freedom timeline'
        ]
      }
    ]
  }
}

export const FINANCIAL_SCENARIOS = [
  {
    name: 'The Power of Starting Early',
    age_start_20: { principal: 200, monthly: true, rate: 7, years: 45, result: 1100000 },
    age_start_30: { principal: 200, monthly: true, rate: 7, years: 35, result: 650000 },
    lesson: 'Starting 10 years earlier DOUBLES your wealth'
  },
  {
    name: 'Credit Card Debt Trap',
    principal: 5000,
    rate: 18,
    minPayment: 100,
    years: 5,
    result: 20000,
    lesson: 'Credit card debt GROWS faster than you pay it'
  },
  {
    name: 'Building a Million',
    principal: 10000,
    rate: 8,
    years: 40,
    result: 621000,
    lesson: 'Let compound interest make you rich'
  },
  {
    name: 'Daily Compound Magic',
    principal: 1000,
    rate: 5,
    daily: true,
    years: 30,
    result: 4500,
    lesson: 'Daily compounding grows faster than yearly'
  }
]

export const TAX_DEDUCTIONS = {
  home_office: {
    name: 'Home Office',
    deduction: 5000,
    perYear: true,
    requirement: 'Must be primary workspace',
    tracking: 'Square footage × rate'
  },
  business_mileage: {
    name: 'Business Mileage',
    deduction: 0.67, // per mile
    perMile: true,
    requirement: 'Must track date, miles, purpose',
    tracking: 'Mileage log'
  },
  supplies: {
    name: 'Office Supplies',
    deduction: 'unlimited',
    requirement: 'Must keep receipts',
    tracking: 'Receipts folder'
  },
  equipment: {
    name: 'Equipment & Technology',
    deduction: 'unlimited',
    requirement: 'Business use only',
    tracking: 'Depreciation schedule'
  },
  software: {
    name: 'Software Subscriptions',
    deduction: 'unlimited',
    requirement: 'Business-related',
    tracking: 'Monthly receipts'
  },
  education: {
    name: 'Continuing Education',
    deduction: 'unlimited',
    requirement: 'Job-related',
    tracking: 'Course receipts'
  },
  health_insurance: {
    name: 'Self-Employed Health Insurance',
    deduction: 'premiums',
    requirement: 'If self-employed',
    tracking: 'Annual statements'
  },
  retirement: {
    name: 'Retirement Contributions',
    deduction: 20000,
    perYear: true,
    requirement: 'Solo 401k or SEP-IRA',
    tracking: 'Contribution statements'
  }
}

export const BANKING_CONCEPTS = {
  federal_reserve: {
    name: 'The Federal Reserve',
    description: 'Central bank of the US',
    controls: 'Money supply and interest rates',
    impact: 'Affects all bank rates'
  },
  fractional_reserve: {
    name: 'Fractional Reserve Banking',
    description: 'Banks lend out more than they have',
    ratio: '10% must be held, 90% can be lent',
    example: '$1000 deposit = $10,000 in lending power'
  },
  fdic_insurance: {
    name: 'FDIC Insurance',
    description: 'Protects your deposits',
    coverage: '$250,000 per account',
    requirement: 'Bank must be FDIC insured',
    importance: 'Your money is safe'
  },
  interest_rates: {
    name: 'Bank Interest Rates',
    savings_account: '0.01% - 4.5%',
    cd: '4% - 5.5%',
    money_market: '4% - 5%',
    tip: 'Shop around for best rates'
  }
}

// Helper functions
export function calculateCompoundInterest(principal, rate, years, compounding = 'daily') {
  const n = compounding === 'daily' ? 365 : 12
  const amount = principal * Math.pow(1 + rate / 100 / n, n * years)
  return Math.round(amount)
}

export function calculateMonthlyPayment(principal, rate, years) {
  const monthlyRate = rate / 100 / 12
  const numberOfPayments = years * 12
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                   (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  return Math.round(payment)
}

export function getDeductionAdvice(category) {
  return TAX_DEDUCTIONS[category]
}

export function getAllFinancialCourses() {
  return { ...FINANCIAL_COURSES }
}
