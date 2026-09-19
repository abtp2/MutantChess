// AI Bots roster for MutantChess - 7 Curated Bots with authentic portrait images
export const BOTS = [
  {
    id: 'martin',
    name: 'Martin',
    title: 'Friendly Beginner',
    elo: 250,
    category: 'Beginner',
    image: '/bots/martin.png',
    color: '#84cc16',
    bio: 'Just learning the rules of chess! Plays quickly, loves pushing random pawns, and blunders frequently.',
    personality: 'Humble, eager beginner, blunder-prone',
    skillLevel: 0,
    depth: 2,
    moveTime: 80,
    quotes: {
      start: [
        "Hi! I just learned how the horsey moves. Have fun!",
        "Is it my turn yet? Let's play chess!",
        "I hope I don't give away my queen again!"
      ],
      win: [
        "Wait, did I win?! Even I didn't expect that!",
        "Wow, maybe I'm getting better at this!",
      ],
      loss: [
        "Good game! One day I'll become a grandmaster too!",
        "You're really good! Let me try again!",
      ],
      capture: [
        "Ooh, a piece! Can I take it? Yes!",
        "Look, I captured something!",
      ],
      check: [
        "I think this is check? Let me check my notes.",
        "Check! Am I doing this right?",
      ]
    }
  },
  {
    id: 'oliver',
    name: 'Oliver',
    title: 'Enthusiastic Learner',
    elo: 550,
    category: 'Beginner',
    image: '/bots/oliver.png',
    color: '#22c55e',
    bio: 'Knows how pieces move and tries to defend them. Developing basic tactical awareness.',
    personality: 'Curious, energetic, learning fast',
    skillLevel: 1,
    depth: 3,
    moveTime: 120,
    quotes: {
      start: [
        "Let's play! I've been practicing my openings!",
        "Don't underestimate me, I'm getting stronger!",
        "Ready to move some pieces!"
      ],
      win: [
        "Yes! Practice makes perfect!",
        "That was exciting! Great match!",
      ],
      loss: [
        "Nice moves! I'm learning from every defeat.",
        "You got me this time! Let's play another.",
      ],
      capture: [
        "I got your piece!",
        "Trading pieces is fun!",
      ],
      check: [
        "Check! Watch out!",
        "Your king has to move now!",
      ]
    }
  },
  {
    id: 'ashutosh_dev',
    name: 'Ashutosh_dev (Creator)',
    title: 'The Creator',
    elo: 1000,
    category: 'Casual & Club',
    image: '/bots/ashutosh_dev.jpg',
    color: '#3b82f6',
    bio: 'Creator & Developer of MutantChess! Plays sharp tactical moves, loves open tactical games, and codes while playing.',
    personality: 'Friendly & energetic coder',
    skillLevel: 4,
    depth: 5,
    moveTime: 180,
    quotes: {
      start: [
        "Welcome to MutantChess! Let's write some clean code on 64 squares!",
        "Compiling my opening repertoire... Ready to roll!",
        "May the best algorithm win! Have fun!"
      ],
      win: [
        "All test cases passed! Checkmate confirmed. Rematch?",
        "Clean refactor! Good game friend, you played bravely!",
      ],
      loss: [
        "Segmentation fault! Beautiful tactic, you completely outplayed my algorithm!",
        "Exception caught! That was a masterclass move from you!",
      ],
      capture: [
        "Deleting redundant variables from the board!",
        "Freeing up memory... and your piece!",
      ],
      check: [
        "Runtime alert: your King is under pressure!",
        "Check! Can your King handle this exception?",
      ]
    }
  },
  {
    id: 'wendy',
    name: 'Wendy',
    title: 'Intermediate Tactician',
    elo: 1500,
    category: 'Intermediate',
    image: '/bots/wendy.png',
    color: '#ec4899',
    bio: 'A sharp, confident tactical player. Loves active piece play, forks, and aggressive king-side attacks.',
    personality: 'Sharp, confident, tactical attacker',
    skillLevel: 8,
    depth: 8,
    moveTime: 380,
    quotes: {
      start: [
        "Let's see if your tactical defenses hold up!",
        "I like an open, dynamic game. Let's make it exciting!",
        "Ready whenever you are!"
      ],
      win: [
        "Tactics decide games! Well played though.",
        "A sharp attack pays off! Care for a rematch?",
      ],
      loss: [
        "Impressive counter-attack! You completely saw through my plan.",
        "Superb defense! You earned that victory.",
      ],
      capture: [
        "Piece taken! The initiative is mine.",
        "A favorable trade for my attack!",
      ],
      check: [
        "Check! Your king looks exposed.",
        "Pressure is on your king now!",
      ]
    }
  },
  {
    id: 'charles',
    name: 'Charles',
    title: 'Club Expert',
    elo: 2000,
    category: 'Expert',
    image: '/bots/charles.png',
    color: '#8b5cf6',
    bio: 'A seasoned club expert with deep opening theory and positional calculation. Makes few unforced errors.',
    personality: 'Methodical, disciplined, classical player',
    skillLevel: 13,
    depth: 11,
    moveTime: 550,
    quotes: {
      start: [
        "A classical game of chess awaits us. Let's begin.",
        "Sound principles always carry the day.",
        "Prepare for a thorough strategic test."
      ],
      win: [
        "Sound positional play prevails. A commendable effort.",
        "Good game. The center control proved decisive.",
      ],
      loss: [
        "Remarkable play! You completely outmaneuvered me.",
        "Splendid calculation. I concede.",
      ],
      capture: [
        "Executing the positional exchange.",
        "Maintaining pawn structure integrity.",
      ],
      check: [
        "Check. How do you respond?",
        "Your king is displaced.",
      ]
    }
  },
  {
    id: 'noam',
    name: 'Noam',
    title: 'Master Strategist',
    elo: 2200,
    category: 'Master',
    image: '/bots/noam.png',
    color: '#06b6d4',
    bio: 'A formidable master who suffocates counterplay, punishes slight weaknesses, and converts endgames effortlessly.',
    personality: 'Intense, relentless, precise calculator',
    skillLevel: 15,
    depth: 13,
    moveTime: 650,
    quotes: {
      start: [
        "Every move must be precise. Show me your best chess.",
        "Small advantages accumulate into checkmate.",
        "Let the struggle of minds begin."
      ],
      win: [
        "Precision in the endgame decided it. Respect.",
        "A relentless conversion. Well fought.",
      ],
      loss: [
        "Flawless calculation! You found moves I did not foresee.",
        "Exceptional performance. Hats off to you.",
      ],
      capture: [
        "Removing your most active piece.",
        "The tension resolves in my favor.",
      ],
      check: [
        "Check. The net tightens.",
        "Defend with utmost accuracy.",
      ]
    }
  },
  {
    id: 'wei',
    name: 'Wei',
    title: 'Grandmaster Champion',
    elo: 2450,
    category: 'Grandmaster',
    image: '/bots/wei.png',
    color: '#f59e0b',
    bio: 'An elite grandmaster with world-class calculation, tactical depth, and relentless endgame technique.',
    personality: 'Profound, silent, grandmaster level',
    skillLevel: 18,
    depth: 15,
    moveTime: 850,
    quotes: {
      start: [
        "Welcome. Let us create something memorable on 64 squares.",
        "Chess at the highest level requires patience and courage.",
        "I am ready. Your move."
      ],
      win: [
        "The struggle was fierce. A grand battle.",
        "Technique and patience. Thank you for the game.",
      ],
      loss: [
        "Brilliant! A true grandmaster-level display from you.",
        "You played with incredible depth. A masterclass.",
      ],
      capture: [
        "A decisive simplification.",
        "The material balance shifts.",
      ],
      check: [
        "Check. The critical moment arrives.",
        "Defend your king.",
      ]
    }
  }
];

export function getBotById(id) {
  return BOTS.find(b => b.id === id) || BOTS[2]; // default to Ashutosh_dev
}

export function getBotSettingsForElo(elo) {
  const clampedElo = Math.max(250, Math.min(3000, elo));
  if (clampedElo <= 500) {
    return { skillLevel: 0, depth: 2, moveTime: 80 };
  } else if (clampedElo <= 800) {
    return { skillLevel: 1, depth: 3, moveTime: 120 };
  } else if (clampedElo <= 1150) {
    return { skillLevel: 4, depth: 5, moveTime: 180 };
  } else if (clampedElo <= 1750) {
    return { skillLevel: 8, depth: 8, moveTime: 380 };
  } else if (clampedElo <= 2100) {
    return { skillLevel: 13, depth: 11, moveTime: 550 };
  } else if (clampedElo <= 2300) {
    return { skillLevel: 15, depth: 13, moveTime: 650 };
  } else {
    return { skillLevel: 18, depth: 15, moveTime: 850 };
  }
}

export function getThinkingTimeForElo(elo, moveNumber = 1) {
  const clampedElo = Math.max(250, Math.min(3000, elo));
  const isEarlyOpening = moveNumber <= 3;

  let baseTime;
  let jitter;

  if (clampedElo <= 500) {
    baseTime = 300;
    jitter = 300;
  } else if (clampedElo <= 800) {
    baseTime = 400;
    jitter = 400;
  } else if (clampedElo <= 1150) {
    baseTime = 550;
    jitter = 550;
  } else if (clampedElo <= 1750) {
    baseTime = 900;
    jitter = 650;
  } else if (clampedElo <= 2100) {
    baseTime = 1300;
    jitter = 700;
  } else if (clampedElo <= 2300) {
    baseTime = 1600;
    jitter = 850;
  } else {
    baseTime = 2000;
    jitter = 1100;
  }

  if (isEarlyOpening) {
    return Math.floor((baseTime * 0.55) + Math.random() * (jitter * 0.45));
  }

  return Math.floor(baseTime + Math.random() * jitter);
}
