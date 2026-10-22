// Advanced Financial Numbers & Forms System
// Teaching people how to navigate and leverage the hidden financial systems
// DUNS, CUSIP, EIN, Trust EIN, 9A Banking Numbers, and more

export const FINANCIAL_NUMBERS_SYSTEM = {
  // ===== DUNS NUMBERS (Data Universal Numbering System) =====
  duns: {
    name: 'DUNS Number',
    fullName: 'Data Universal Numbering System',
    purpose: 'Business identification number used by Dun & Bradstreet',
    uses: [
      'Business credit establishment',
      'Government contracts and procurement',
      'Banking relationships',
      'Supplier relationships',
      'Building business credit separate from personal credit'
    ],
    how_to_get: {
      step1: 'Register with Dun & Bradstreet (dunandbrads treet.com)',
      step2: 'Provide business information (name, address, type)',
      step3: 'Receive 9-digit DUNS number',
      step4: 'Use to build business credit',
      cost: 'FREE to register'
    },
    power: 'Separates personal from business credit, allows you to borrow in business name',
    importance: 'CRITICAL for business credibility and access to capital',
    lesson: 'The system identifies WHO you are in commerce'
  },

  // ===== CUSIP NUMBERS (Committee on Uniform Security Identification Procedures) =====
  cusip: {
    name: 'CUSIP Number',
    fullName: 'Committee on Uniform Security Identification Procedures',
    purpose: 'Identification number for stocks, bonds, and other securities',
    uses: [
      'Tracking stocks',
      'Tracking bonds',
      'Tracking mutual funds',
      'Securities transactions',
      'Investment portfolio management'
    ],
    structure: {
      length: '9 characters',
      format: '6 digits (issuer) + 2 digits (issue) + 1 check digit',
      example: 'AAPL: 037833100'
    },
    how_to_use: 'When buying/selling securities, CUSIP identifies exactly what you\'re trading',
    importance: 'Protects investors, ensures clear identification in markets',
    lesson: 'Every security has an identity number - just like you have an SSN'
  },

  // ===== EIN (Employer Identification Number) =====
  ein: {
    name: 'EIN',
    fullName: 'Employer Identification Number',
    purpose: 'Federal tax identification number for businesses',
    uses: [
      'Sole proprietors (not required but recommended)',
      'Partnerships',
      'Corporations',
      'LLCs',
      'Non-profits',
      'Trusts with business income',
      'Building business credit'
    ],
    structure: {
      format: 'XX-XXXXXXX (9 digits)',
      example: '12-3456789'
    },
    how_to_get: {
      method1: 'Online at IRS.gov (instant)',
      method2: 'Phone: 1-800-829-4933',
      method3: 'By mail (takes longer)',
      cost: 'FREE'
    },
    power: 'Establishes business as separate entity from you personally',
    tax_benefits: [
      'Deduct business expenses',
      'Hire employees legally',
      'Open business bank account',
      'Build business credit'
    ],
    lesson: 'Your business gets its own identity number'
  },

  // ===== TRUST EIN =====
  trust_ein: {
    name: 'Trust EIN',
    purpose: 'Employer Identification Number for a trust',
    uses: [
      'Revocable Living Trusts with business activity',
      'Irrevocable Trusts',
      'Dynasty Trusts',
      'Testamentary Trusts with income',
      'Estate administration'
    ],
    difference_from_ssn: 'Separate number = separate entity from you',
    how_to_get: {
      step1: 'Create trust document',
      step2: 'Apply for EIN (same process as business)',
      step3: 'Trust has its own bank account',
      step4: 'Trust can own property, investments, business',
      cost: 'FREE'
    },
    power: 'Trust as separate legal entity protects assets and privacy',
    tax_implications: 'Trust files its own return (1041)',
    lesson: 'A trust is ALIVE - it has its own identity number and can own things'
  },

  // ===== 9A SERIES BANKING NUMBERS =====
  banking_9a_series: {
    name: '9A Series Banking Numbers',
    category: 'Banking Account Structures',
    purpose: 'Understanding Federal Reserve banking codes and account types',
    types: {
      account_classification: {
        meaning: 'Type of account (checking, savings, credit line)',
        example: '9A1 = Federal funds account'
      },
      federal_reserve_routing: {
        meaning: 'Federal Reserve routing codes',
        structure: 'Identifies which Fed region and bank'
      },
      account_type_coding: {
        meaning: 'What kind of account it is',
        examples: [
          '9A = Demand deposits (checking)',
          '9B = Time deposits (CDs)',
          '9C = Savings accounts',
          '9D = Sweep accounts',
          '9E = Credit line accounts'
        ]
      }
    },
    importance: 'Understanding account codes helps you navigate banking system',
    how_banks_use_it: 'Banks use these codes internally to route money and categorize accounts',
    lesson: 'The numbers behind the numbers - how banks organize money flow'
  },

  // ===== BRASS NUMBERS (if exists) / Bank Account Numbers =====
  brass_or_account_structure: {
    name: 'Bank Account Number Structure',
    purpose: 'Understanding how bank accounts are coded and what each part means',
    structure: {
      routing_number: {
        length: '9 digits',
        meaning: 'Identifies the specific bank/branch',
        example: '021000021 = Chase Bank NYC'
      },
      account_number: {
        length: 'Varies (usually 8-17 digits)',
        meaning: 'Your specific account',
        security: 'Should keep private'
      },
      check_digit: {
        meaning: 'Verification digit to prevent errors',
        calculation: 'Mathematical formula validates account'
      }
    },
    how_banks_use_it: 'Routes your money to exact account; prevents fraud',
    what_you_need_to_know: 'These numbers are how you access YOUR money - understand what they mean',
    lesson: 'Your account is identified by numbers - just like you are identified by SSN'
  },

  // ===== SOCIAL SECURITY NUMBER AS TRUST ACCOUNT =====
  ssn_trust_account: {
    name: 'Social Security Number as Trust Account',
    controversy: 'Hidden truth about what your SSN really is',
    theory: 'SSN creates a strawman account in your name',
    what_government_says: 'SSN is just a tracking number for Social Security',
    what_people_claim: 'SSN creates a trust/credit account government never told you to use',
    the_claim: {
      premise: 'Government creates SSN account at your birth',
      value: 'Creates a credit line in your name',
      hidden_from_you: 'Never told how to ACCESS or USE this account',
      consequence: 'Government/banks use YOUR credit without you knowing'
    },
    how_people_try_to_use_it: [
      'Sending notices claiming the SSN trust as their account',
      'Attempting to draw from the account as "principal"',
      'Using specific legal/financial language to "access" it',
      'Claiming immunity from taxation'
    ],
    reality_check: 'IRS and courts do NOT recognize these claims',
    but_the_question_remains: 'Why is SSN the basis for all credit? Why isn\'t it taught?',
    teaching_point: 'UNDERSTAND the system, even if the "claims" don\'t legally work yet',
    lesson: 'Your SSN = your economic identity in the system - understand it'
  }
}

// ===== 1099 FORMS =====
export const IRS_1099_FORMS = {
  '1099-A': {
    title: '1099-A: Acquisition or Abandonment of Secured Property',
    when_used: 'When property securing a debt is foreclosed or abandoned',
    who_issues: 'Lenders/financial institutions',
    reporting: 'Property address, full sale price, amount paid down',
    tax_impact: 'May indicate cancellation of debt (taxable income)',
    learning_point: 'Understand foreclosure process and tax consequences'
  },
  '1099-B': {
    title: '1099-B: Proceeds from Broker and Barter Exchange Transactions',
    when_used: 'When you sell stocks, bonds, mutual funds, or crypto',
    who_issues: 'Brokers, exchanges',
    reporting: 'Sale proceeds, cost basis, gain/loss',
    tax_impact: 'Capital gains tax - short term (under 1 year) vs long term (over 1 year)',
    learning_point: 'Understand investment taxation and how brokers track sales'
  },
  '1099-C': {
    title: '1099-C: Cancellation of Debt',
    when_used: 'When debt is forgiven (credit card, loan, etc.)',
    who_issues: 'Creditors',
    reporting: 'Amount of debt canceled',
    tax_impact: 'Canceled debt = TAXABLE INCOME (unless exception applies)',
    learning_point: 'Debt forgiveness ≠ free money (IRS sees it as income)'
  },
  '1099-INT': {
    title: '1099-INT: Interest Income',
    when_used: 'When you earn interest (savings, bonds, money market)',
    who_issues: 'Banks, investment companies',
    reporting: 'Interest earned from all sources',
    tax_impact: 'Ordinary income tax',
    learning_point: 'Track ALL interest income - even small amounts'
  },
  '1099-DIV': {
    title: '1099-DIV: Dividends and Distributions',
    when_used: 'When you receive dividends from stocks/mutual funds',
    who_issues: 'Investment companies, brokers',
    reporting: 'Ordinary dividends, qualified dividends, capital gain distributions',
    tax_impact: 'Qualified dividends = lower tax rate (15-20%), ordinary = regular rate',
    learning_point: 'Different types of dividends get taxed differently'
  },
  '1099-MISC': {
    title: '1099-MISC: Miscellaneous Income',
    when_used: 'Self-employment, freelance, prizes, rent (sometimes)',
    who_issues: 'Anyone paying you $600+',
    reporting: 'Other income sources',
    tax_impact: 'Subject to self-employment tax if self-employed',
    learning_point: 'ALL income must be reported, not just W-2s'
  },
  '1099-NEC': {
    title: '1099-NEC: Nonemployee Compensation',
    when_used: 'Independent contractor, freelance, consulting',
    who_issues: 'Clients who paid you',
    reporting: 'Payments received',
    tax_impact: 'Self-employment tax required (15.3%)',
    learning_point: 'Self-employed = pay both employer and employee taxes'
  }
}

// ===== HELPER FUNCTIONS =====
export function getFinancialNumberInfo(numberType) {
  return FINANCIAL_NUMBERS_SYSTEM[numberType]
}

export function get1099Info(formType) {
  return IRS_1099_FORMS[formType]
}

export function getAllFinancialNumbers() {
  return FINANCIAL_NUMBERS_SYSTEM
}

export function getAllTaxForms() {
  return IRS_1099_FORMS
}

// Educational course data
export const ADVANCED_FINANCIAL_COURSES = {
  financial_numbers_101: {
    title: 'Understanding Financial Numbers: DUNS, EIN, CUSIP',
    level: 'high_school',
    price: 9900,
    modules: [
      'What is DUNS and why your business needs it',
      'EIN: Making your business separate from you',
      'CUSIP Numbers: Understanding securities',
      'Building business credit with numbers'
    ]
  },
  banking_system_revealed_201: {
    title: 'Behind The Wizard of Oz: How Banking Really Works',
    level: 'college',
    price: 14900,
    modules: [
      'The hidden mechanics: 9A series and account structures',
      'How banks route your money',
      'Federal Reserve and money creation',
      'Your account = their leverage',
      'Understanding the system to escape it'
    ]
  },
  tax_forms_and_filings_150: {
    title: 'Tax Forms Decoded: 1099s and What They Mean',
    level: 'high_school',
    price: 7900,
    modules: [
      '1099-A through 1099-NEC: Understanding each form',
      'What income gets reported where',
      'Tax consequences of each form type',
      'How to track and minimize taxes legally'
    ]
  },
  ssn_and_credit_system_301: {
    title: 'Your SSN, Your Credit, Your Power',
    level: 'college',
    price: 12900,
    modules: [
      'What is your SSN really?',
      'How SSN creates credit in your name',
      'The claims people make (and why courts reject them)',
      'Understanding your economic identity',
      'Building wealth within the system'
    ]
  }
}
