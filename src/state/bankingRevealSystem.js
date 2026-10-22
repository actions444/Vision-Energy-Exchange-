import { create } from 'zustand'

/**
 * Banking Reveal System
 *
 * PURPOSE: Show players what's REALLY happening behind the scenes in banking
 * "Behind the Wizard of Oz" - revealing the hidden mechanics of the financial system
 *
 * Players enter a bank, deposit money, and see:
 * 1. What they THINK is happening
 * 2. What's ACTUALLY happening behind the scenes
 * 3. How banks use their money
 * 4. How the system creates wealth for banks, not depositors
 */

export const useBankingRevealSystem = create((set, get) => ({
  playerBankAccounts: {}, // accountId -> account data
  bankingLessons: [],
  revealedMechanics: false,

  // ===== PLAYER BANKING =====
  openBankAccount: (playerId, accountName = 'Checking') => {
    const accountId = `account_${playerId}_${Date.now()}`

    set(state => ({
      playerBankAccounts: {
        ...state.playerBankAccounts,
        [accountId]: {
          accountId,
          playerId,
          accountName,
          balance: 0,
          deposits: [],
          routing_number: '021000021', // Chase example
          account_number: Math.random().toString().slice(2, 12), // 10 digits
          account_type: '9A', // Demand deposit
          created_at: new Date(),
          interest_rate: 0.01, // 0.01% APY (what banks ACTUALLY pay you)
          transactions: [],
          revealed_mechanics: null
        }
      }
    }))

    return accountId
  },

  // ===== MAKE A DEPOSIT =====
  depositMoney: (accountId, amount) => {
    const account = get().playerBankAccounts[accountId]
    if (!account) return null

    set(state => ({
      playerBankAccounts: {
        ...state.playerBankAccounts,
        [accountId]: {
          ...account,
          balance: account.balance + amount,
          deposits: [
            ...account.deposits,
            {
              amount,
              date: new Date(),
              visible_to_customer: true
            }
          ],
          transactions: [
            ...account.transactions,
            {
              type: 'deposit',
              amount,
              timestamp: new Date(),
              description: 'Customer deposit'
            }
          ]
        }
      }
    }))

    // NOW REVEAL WHAT'S HAPPENING
    return revealBankingMechanics(accountId, amount, account)
  },

  // ===== THE BIG REVEAL: WHAT'S REALLY HAPPENING =====
  revealMechanics: (accountId) => {
    const account = get().playerBankAccounts[accountId]
    if (!account) return null

    const revelation = {
      what_customer_thinks: {
        title: 'What You Think Is Happening',
        belief: 'Bank is safely holding your money',
        assumption: 'Your $1,000 is sitting in a vault with your name on it',
        customer_view: {
          'Your Money': account.balance,
          'Interest Earned': 'Very little (0.01%)',
          'Your Control': 'Can withdraw anytime'
        }
      },

      what_is_actually_happening: {
        title: 'What\'s ACTUALLY Happening Behind the Scenes',
        reality: 'Your money is GONE - bank is using it',

        the_mechanism: {
          step_1_your_deposit: `You deposit $${account.balance}`,
          step_2_bank_takes_it: 'Bank immediately takes possession of YOUR money',
          step_3_fractional_reserve: `Bank keeps 10% ($${Math.round(account.balance * 0.1)}) as reserve`,
          step_4_lends_out_90: `Bank lends out 90% ($${Math.round(account.balance * 0.9)}) at 5-7% interest`,
          step_5_they_profit: `Bank profits $${Math.round(account.balance * 0.9 * 0.05)} per year from YOUR money`,
          step_6_you_get: `You get 0.01% ($${(account.balance * 0.0001).toFixed(2)}) per year`
        },

        the_numbers: {
          your_deposit: account.balance,
          bank_reserve_requirement: Math.round(account.balance * 0.1),
          bank_lending_power: Math.round(account.balance * 0.9),
          interest_bank_charges_borrowers: '5-7% ($' + Math.round(account.balance * 0.9 * 0.06) + '/year)',
          interest_bank_pays_you: '0.01% ($' + (account.balance * 0.0001).toFixed(2) + '/year)',
          bank_profit_spread: Math.round(account.balance * 0.9 * 0.0599) + '/year'
        },

        who_owns_the_money: {
          legally: 'YOU own the money (on paper)',
          practically: 'Bank owns it - they can loan it, invest it, use it',
          what_you_can_do: 'Withdraw your original amount (if they haven\'t loaned it all)',
          what_happens_if_many_withdraw: 'Bank run - banks fail because they don\'t actually have all the money'
        },

        the_hidden_truth: [
          'Fractional reserve banking = lending money that doesn\'t exist',
          'Your deposit = the bank\'s asset',
          'You = creditor to the bank (they owe you)',
          'But the bank uses YOUR credit to create MORE credit',
          'And keeps the profit'
        ]
      },

      how_to_break_free: {
        understand_the_system: 'Now you see HOW it works',
        become_the_bank: 'Learn to lend your own money at interest',
        build_credit_yourself: 'Don\'t let banks be the middleman',
        own_your_assets: 'Precious metals, real estate, business ownership',
        create_wealth: 'Use the SAME mechanics - lend at interest, keep the spread'
      }
    }

    set(state => ({
      playerBankAccounts: {
        ...state.playerBankAccounts,
        [accountId]: {
          ...state.playerBankAccounts[accountId],
          revealed_mechanics: revelation
        }
      },
      bankingLessons: [
        ...state.bankingLessons,
        {
          lesson_id: `lesson_${accountId}_${Date.now()}`,
          account_id: accountId,
          revelation,
          revealed_at: new Date()
        }
      ]
    }))

    return revelation
  },

  // ===== INTERACTIVE SCENARIOS =====
  showBankingScenario: (accountId, scenario_type) => {
    const scenarios = {
      bank_run: {
        title: 'The Bank Run Scenario',
        description: 'What happens when EVERYONE tries to withdraw at once?',
        setup: 'Bank has $1 million in deposits',
        reality: {
          deposits_on_books: '$1,000,000',
          actual_cash_on_hand: '$100,000 (10% reserve)',
          loaned_out: '$900,000',
          what_happens: 'First 100 people get their money. Person #101 gets nothing. Bank closes.',
          lesson: 'Banks gamble that not everyone will withdraw. They DO NOT have your money.'
        }
      },

      becoming_your_own_bank: {
        title: 'Becoming Your Own Bank',
        description: 'What if YOU were the bank?',
        scenario: {
          you_have: '$10,000',
          you_become_bank: 'You lend to 10 people at $1,000 each at 5% interest',
          you_keep: '$50 per person per year = $500/year profit',
          over_20_years: '$10,000 profit (100% return)',
          the_mechanics: 'Same as what banks do - but YOU keep the profit',
          power: 'You control the money supply, you set the terms'
        }
      },

      credit_creation: {
        title: 'How Credit Is Created',
        description: 'Banks don\'t lend existing money - they CREATE money',
        the_truth: {
          myth: 'Banks lend money from deposits',
          reality: 'Banks CREATE money out of thin air via loans',
          how: 'They issue a loan = they create that money into existence',
          proof: 'When you borrow $300,000, that money didn\'t exist before',
          who_profits: 'Bank creates money, you pay interest on created money',
          lesson: 'The system is rigged in banks\' favor from the START'
        }
      },

      asset_backed_vs_credit: {
        title: 'Asset-Backed vs Credit-Based Money',
        comparison: {
          credit_based: 'Current system - money backed by debt promises',
          asset_backed: 'Money backed by gold, land, commodities',
          why_it_matters: 'Asset-backed = limited supply = you can\'t be inflated away',
          what_banks_want: 'Credit-based system = infinite lending = infinite profit',
          what_people_want: 'Asset-backed system = true value = stability'
        }
      }
    }

    return scenarios[scenario_type] || null
  },

  // ===== UNDERSTANDING YOUR ACCOUNT NUMBERS =====
  explainAccountNumbers: (accountId) => {
    const account = get().playerBankAccounts[accountId]
    if (!account) return null

    return {
      your_account_numbers: {
        routing_number: account.routing_number,
        routing_meaning: 'Identifies YOUR bank and its location',
        routing_purpose: 'Money knows where to go'
      },
      account_number: account.account_number,
      account_meaning: 'Your specific account (uniquely identifies you)',
      account_type_code: account.account_type,
      account_type_meaning: '9A = Demand deposit (checking account)',

      what_these_numbers_mean: [
        'Routing number = THE BANK\'s identity',
        'Account number = YOUR identity within that bank',
        'Account type = What kind of account (checking, savings, credit, etc.)',
        'Together = THE SYSTEM KNOWS EXACTLY WHO YOU ARE AND WHERE YOUR MONEY IS'
      ],

      the_hidden_truth: 'Just like your SSN is YOUR number, these are your BANKING numbers. The system is organized by numbers. Understand the numbers = understand the system.',

      lesson: 'Numbers are how the system tracks and controls money flow. Know your numbers.'
    }
  },

  // ===== GET ALL ACCOUNT INFO WITH REVELATION =====
  getAccountStatement: (accountId) => {
    const account = get().playerBankAccounts[accountId]
    if (!account) return null

    const interest_earned = account.balance * (account.interest_rate / 100)
    const bank_profit_on_your_deposit = account.balance * 0.9 * 0.06 // 6% average lending rate
    const spread = bank_profit_on_your_deposit - interest_earned

    return {
      account_number: account.account_number,
      routing_number: account.routing_number,
      balance: account.balance,
      account_type: account.account_type,

      what_bank_pays_you: interest_earned.toFixed(2),
      what_bank_keeps: spread.toFixed(2),
      your_percentage: (account.interest_rate).toFixed(2) + '%',
      bank_percentage: '5-7%',

      the_reality: 'Your $' + account.balance + ' earns you $' + interest_earned.toFixed(2) + ' per year. It earns the bank $' + bank_profit_on_your_deposit.toFixed(2) + ' per year. The spread is $' + spread.toFixed(2) + '.'
    }
  }
}))

// Helper function
function revealBankingMechanics(accountId, depositAmount, account) {
  const bankReserve = Math.round(depositAmount * 0.1)
  const bankLendingPower = Math.round(depositAmount * 0.9)
  const bankProfitAnnual = Math.round(bankLendingPower * 0.06)
  const playerInterestAnnual = (depositAmount * 0.0001).toFixed(2)

  return {
    deposit_amount: depositAmount,
    bank_reserve: bankReserve,
    bank_lending_power: bankLendingPower,
    bank_annual_profit: bankProfitAnnual,
    player_annual_interest: playerInterestAnnual,
    revelation_text: `You just deposited $${depositAmount}. Bank keeps $${bankReserve}. Bank lends out $${bankLendingPower} at 5-7% = $${bankProfitAnnual}/year profit. You get $${playerInterestAnnual}/year. The spread: $${(bankProfitAnnual - playerInterestAnnual).toFixed(2)}/year goes to the bank.`
  }
}
