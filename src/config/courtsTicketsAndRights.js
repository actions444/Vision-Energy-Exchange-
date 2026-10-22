// Courts, Tickets & Your Rights System
// Understanding traffic stops, citations, court procedures, and what police can and cannot do
// Based on real-world experiences like what happened at USPS

export const POLICE_ENCOUNTER_ADVANCED = {
  your_rights_during_traffic_stop: {
    right_to_refuse_search: {
      the_right: 'Police CANNOT search your car without consent or warrant',
      what_to_say: '"I do not consent to a search."',
      police_trick: 'They\'ll ask "Do you mind if I search?" - say NO',
      what_happens_if_you_refuse: 'They may call K-9, waste time, but CANNOT search without warrant',
      if_they_search_anyway: 'Anything found may be inadmissible in court (illegal search)'
    },

    right_to_refuse_questions: {
      the_right: 'Police do NOT have to read you rights unless you\'re in custody',
      during_traffic_stop: 'You\'re not in custody yet',
      what_to_say: '"I do not wish to answer questions without an attorney."',
      they_will_push: 'Ask anyway - ignore them',
      invokes_protection: 'Once you ask for attorney, police must stop questioning'
    },

    right_to_refuse_signature: {
      THE_CRITICAL_RIGHT: 'You do NOT have to sign a ticket or citation',
      what_the_signature_means: 'It is NOT an admission of guilt',
      it_means: 'You promise to appear in court',
      if_you_refuse: 'Police can arrest you for failure to sign (some states)',
      TRINITY\'S_EXPERIENCE: 'You told cop "I don\'t have to sign, I\'ll show up to court"',
      what_happened: 'Cop escalated - hand on gun - because you asserted your right',
      the_point: 'Police use violence when people know their rights'
    },

    right_to_refuse_breathalyzer: {
      during_traffic_stop: 'You CAN refuse roadside breathalyzer (not admissible)',
      during_arrest: 'You CAN refuse, but DUI penalties apply (license suspension)',
      blood_test: 'You have more right to refuse (harder evidence)',
      implied_consent: 'By driving, you consent to test - but you can still refuse'
    },

    right_to_film_police: {
      the_right: 'You can film police in public',
      from_your_car: 'You can film out your window',
      from_sidewalk: 'You can film',
      what_police_say: 'They claim interference - it\'s NOT',
      standing_your_ground: '"I\'m exercising my First Amendment right to record"'
    },

    right_to_remain_silent: {
      during_traffic_stop: 'You have this right',
      how_to_invoke: '"I wish to exercise my right to remain silent"',
      what_it_means: 'You don\'t have to answer anything (except license/registration)',
      they_will_ask_questions: 'Stay silent anyway',
      protection: 'Cannot be used against you in court'
    }
  },

  what_police_CAN_do: [
    'Ask for license, registration, insurance',
    'Order you out of car (for safety)',
    'Pat down jacket for weapons (frisk)',
    'Look at plain view items visible',
    'Call K-9 (but limited time)',
    'Give you a ticket'
  ],

  what_police_CANNOT_do: [
    'Search car without consent or warrant',
    'Search trunk without warrant',
    'Search glove compartment without warrant',
    'Ask invasive personal questions without attorney present',
    'Demand you take breathalyzer (can refuse)',
    'Detain you indefinitely',
    'Use excessive force'
  ],

  if_police_escalate: {
    hand_on_gun: 'Document it (mental note: time, location, officer name/badge)',
    aggressive_language: 'Stay calm - do not match their energy',
    reaching_for_gun: '"Are you threatening me with deadly force?"',
    arrest: 'Do NOT resist (even if unlawful). Document and fight in court.',
    after_encounter: 'Write down everything immediately (time, place, officers, what happened)'
  }
}

export const TRAFFIC_CITATION_SYSTEM = {
  when_you_get_a_ticket: {
    step1_officer_gives_citation: 'They hand you paper with date, time, violation',
    step2_signature_required: 'They ask you to sign - YOU CAN REFUSE',
    step3_if_you_refuse: {
      consequence: 'Officer may arrest you for "failure to sign" (state dependent)',
      your_protection: '"I will appear in court. I do not consent to signing."',
      reality: 'This assertion may cause escalation (as you experienced at USPS)'
    },
    step4_read_the_ticket: 'Do NOT admit anything - just read the charges',
    step5_dont_say_yes: 'Do not say "yes" to anything',
    step6_keep_your_copy: 'Keep copy of citation'
  },

  what_the_citation_says: {
    violation_code: 'The law you allegedly violated',
    date_time_location: 'When and where it happened',
    officers_observations: 'What officer claims they saw',
    fine_amount: 'Cost if you plead guilty',
    court_date: 'When to appear (if you don\'t pay)',
    your_options: 'Pay, appear in court, traffic school'
  },

  the_trick: {
    paying_fine: 'Equals guilty plea',
    going_to_traffic_school: 'Also may equal admission',
    appearing_in_court: 'You can contest it'
  }
}

export const TRAFFIC_COURT_SYSTEM = {
  types_of_courts: {
    traffic_court: 'Minor violations (speeding, running light)',
    criminal_court: 'Serious violations (DUI, reckless driving)',
    district_court: 'Traffic appeals'
  },

  how_traffic_court_works: {
    arraignment: {
      what: 'First appearance',
      happens: 'Judge reads charges, asks how you plead',
      your_options: 'Guilty, not guilty, no contest',
      DO_NOT: 'Plead guilty to keep options open'
    },

    discovery: {
      what: 'You get evidence against you',
      includes: [
        'Officer\'s report',
        'Camera/radar evidence',
        'Officer notes',
        'Dashcam video'
      ],
      importance: 'May show officer made mistakes'
    },

    trial: {
      format: 'Officer testifies, you can cross-examine',
      burden: 'Prosecution must prove guilt beyond reasonable doubt',
      your_defense: 'Challenge the evidence',
      common_defenses: [
        'Officer didn\'t actually see the violation',
        'Speed gun was miscalibrated',
        'Sign was obscured',
        'Light timing was wrong'
      ]
    }
  },

  common_traffic_violations: {
    speeding: {
      challenge: 'Speed gun calibration, visibility',
      defense: 'Ask how gun was calibrated, when last serviced'
    },
    running_red_light: {
      challenge: 'Officer didn\'t see light at time of crossing',
      defense: 'Ask if officer saw you enter on red or saw you run through green'
    },
    failure_to_stop: {
      challenge: 'You did stop, officer didn\'t see',
      defense: 'Dash cam, witnesses, your testimony'
    },
    improper_lane_change: {
      challenge: 'Subjective - officer opinion',
      defense: 'Road conditions, distance between cars'
    }
  },

  how_to_prepare: {
    get_discovery: 'Request all evidence from prosecution',
    review_carefully: 'Look for officer mistakes or lack of evidence',
    prepare_questions: 'What will you ask officer during cross-exam?',
    gather_evidence: 'Dashcam, witnesses, photos of scene',
    know_the_law: 'What does the statute actually say?'
  },

  realistic_outcomes: {
    best_case: 'Not guilty - case dismissed',
    middle_case: 'Reduced charge (speeding reduced to civil infraction)',
    worst_case: 'Guilty as charged',
    appeal: 'You can appeal to higher court'
  }
}

export const DRIVER_LICENSE_AND_RIGHTS = {
  your_license: {
    what_it_is: 'Privilege to drive, not a right',
    who_issues: 'State DMV/RMV',
    requirements: 'Pass written and driving test, pay fee'
  },

  suspension_and_revocation: {
    suspension: 'Temporary (you can get it back)',
    revocation: 'Permanent or long-term',
    causes: [
      'Too many points',
      'DUI',
      'Failure to pay tickets',
      'Failure to appear in court'
    ]
  },

  if_you_lose_your_license: {
    consequences: 'Cannot legally drive',
    but_you_can: 'Petition for hardship license (limited driving)',
    to_restore: 'Complete requirements (traffic school, pay fines, etc.)'
  }
}

export const COURT_APPEARANCE_STRATEGY = {
  before_you_go: {
    dress_professionally: 'Judge sees you as credible',
    arrive_early: 'Shows respect for court',
    bring_documents: 'Receipts, photos, evidence',
    know_the_law: 'Cite the actual statute'
  },

  in_the_courtroom: {
    address_judge_as_your_honor: 'Show respect',
    speak_clearly: 'No mumbling, no attitude',
    tell_truth: 'Lying to judge = perjury',
    listen_to_officer: 'Take notes',
    cross_examine: 'Ask questions of officer'
  },

  cross_examination_questions: {
    visibility: 'Could you clearly see the violation?',
    distance: 'How far were you from my vehicle?',
    equipment: 'When was your radar/speed gun last calibrated?',
    other_cars: 'Were there other vehicles involved?',
    visibility_conditions: 'Was lighting/weather clear?'
  },

  if_you_lose: {
    you_can_appeal: 'To district or superior court',
    get_transcript: 'Request court transcript of trial',
    identify_errors: 'What did judge get wrong?',
    hire_attorney: 'If serious, attorney helps on appeal'
  }
}

export const EDUCATIONAL_COURSES_COURTS = {
  traffic_stops_and_rights: {
    title: 'Traffic Stops: Know Your Rights Before Police Approach',
    level: 'high_school',
    price: 7900,
    modules: [
      'What police can and cannot do during a stop',
      'Your right to refuse search, questions, breathalyzer',
      'Right to refuse to sign citation',
      'What NOT to say to police',
      'If police escalate or threaten'
    ]
  },

  traffic_court_system: {
    title: 'Traffic Court: Contest Your Ticket and Win',
    level: 'high_school',
    price: 8900,
    modules: [
      'How to read your citation',
      'Types of violations and defenses',
      'Discovery: getting evidence against you',
      'How to cross-examine the officer',
      'Common winning defenses',
      'What to expect in traffic court'
    ]
  },

  police_encounters_complete: {
    title: 'Police Encounters: From Traffic Stop to Court (Complete Guide)',
    level: 'college',
    price: 12900,
    modules: [
      'Your constitutional rights during stops',
      'How escalation happens (and why)',
      'Why police use force when you know your rights',
      'What to do if arrested',
      'How to document encounters for court',
      'Fighting charges in court'
    ]
  }
}

// The bottom line
export const THE_SYSTEM = {
  why_police_escalated_at_usps: 'Because you asserted a right they wanted you to ignore',
  why_hand_on_gun: 'Intimidation - to make you comply with their unlawful authority',
  what_it_means: 'You were right. They were wrong. They used threat of force.',
  what_you_should_have_done: 'Stayed calm, did not escalate, documented everything, gone to court',
  what_you_need_now: 'Court appearance strategy to prove your case in front of judge',
  the_lesson: 'Know your rights, assert them calmly, document everything, fight in court'
}
