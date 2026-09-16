// AI Bots roster for MutantChess - 5 Curated Bots with Authentic Portrait Images

export const BOTS = [
  {
    id: 'martin',
    name: 'Martin',
    title: 'Friendly Beginner',
    elo: 250,
    category: 'Beginner',
    image: '/bots/martin.jpg',
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
    id: 'ashutosh_dev',
    name: 'Ashutosh_dev',
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
    id: 'oliver',
    name: 'Oliver',
    title: 'Crafty Fox',
    elo: 1500,
    category: 'Intermediate',
    image: '/bots/oliver.jpg',
    color: '#f97316',
    bio: 'A cunning fox who loves clever tricks, sneaky forks, and tactical gambits. Watch your pieces closely!',
    personality: 'Playful, tricky tactician',
    skillLevel: 8,
    depth: 8,
    moveTime: 380,
    quotes: {
      start: [
        "A sly fox never reveals his strategy! Let's see what you've got.",
        "Careful around the center! I might have a trap waiting.",
        "Pawns forward, pieces active! Game on!"
      ],
      win: [
        "Outfoxed! That was a fun tactical puzzle.",
        "Clever tricks win games! Care for a rematch?",
      ],
      loss: [
        "Curses, you saw through my trap! Great tactical vision.",
        "You outsmarted the fox! Splendid game.",
      ],
      capture: [
        "Snack time! Thanks for the piece.",
        "A little tactical trade in my favor!",
      ],
      check: [
        "Check! Nowhere to hide, my friend.",
        "Watch your king, danger approaches!",
      ]
    }
  },
  {
    id: 'luna',
    name: 'Luna',
    title: 'Master Strategist',
    elo: 2000,
    category: 'Expert',
    image: '/bots/luna.jpg',
    color: '#a855f7',
    bio: 'A calm and calculating master of positional chess. Slowly constricts the opponent and pounces on the slightest inaccuracy.',
    personality: 'Calm, deep calculator, positional master',
    skillLevel: 14,
    depth: 12,
    moveTime: 650,
    quotes: {
      start: [
        "The board is a canvas of harmonious possibilities. Let us play.",
        "Every move carries meaning. Make yours count.",
        "Patience and positional harmony win the battle."
      ],
      win: [
        "A harmonious victory. Your defensive ideas were admirable.",
        "Strategy overcomes tactics in the long run. Good game.",
      ],
      loss: [
        "Incredible calculation! You broke through my fortress flawlessly.",
        "Magnificent game! Your play was sharp and decisive.",
      ],
      capture: [
        "Restricting your piece mobility with each exchange.",
        "Precision in every capture.",
      ],
      check: [
        "Check. The net tightens.",
        "Your king is under acute tactical pressure.",
      ]
    }
  },
  {
    id: 'leo',
    name: 'Leo',
    title: 'Grandmaster King',
    elo: 2600,
    category: 'Grandmasters',
    image: '/bots/leo.jpg',
    color: '#eab308',
    bio: 'The regal lion and grandmaster champion! Commands the 64 squares with supreme authority, deep endgame technique, and relentless accuracy.',
    personality: 'Regal, authoritative, supreme technician',
    skillLevel: 19,
    depth: 15,
    moveTime: 950,
    quotes: {
      start: [
        "Bow before the board! A grandmaster battle awaits.",
        "Let us test your chess understanding against supreme technique.",
        "May precision guide our struggle on 64 squares."
      ],
      win: [
        "The crown remains unchallenged. A well-fought effort, mortal!",
        "Endgame technique triumphs again. Splendid fight.",
      ],
      loss: [
        "Unbelievable! You have dethroned the king! Truly legendary play.",
        "Hail to the new champion! That was an immortal game from you.",
      ],
      capture: [
        "Consolidating my royal supremacy.",
        "A piece falls to the pride.",
      ],
      check: [
        "Check! Face the royal assault!",
        "The king roars! Defend your realm.",
      ]
    }
  }
];

export function getBotById(id) {
  return BOTS.find(b => b.id === id) || BOTS[1]; // default to Ashutosh_dev
}

export function getBotSettingsForElo(elo) {
  // Map any Elo (250 - 3000) to Stockfish parameters
  const clampedElo = Math.max(250, Math.min(3000, elo));
  if (clampedElo <= 500) {
    return { skillLevel: 0, depth: 2, moveTime: 80 };
  } else if (clampedElo <= 800) {
    return { skillLevel: 2, depth: 3, moveTime: 120 };
  } else if (clampedElo <= 1150) {
    // 1000 Elo: Stockfish responds in <30ms so thinking timer controls the pace!
    return { skillLevel: 4, depth: 5, moveTime: 180 };
  } else if (clampedElo <= 1450) {
    return { skillLevel: 7, depth: 7, moveTime: 280 };
  } else if (clampedElo <= 1750) {
    return { skillLevel: 10, depth: 9, moveTime: 400 };
  } else if (clampedElo <= 2100) {
    return { skillLevel: 13, depth: 11, moveTime: 550 };
  } else if (clampedElo <= 2450) {
    return { skillLevel: 16, depth: 13, moveTime: 700 };
  } else if (clampedElo <= 2780) {
    return { skillLevel: 19, depth: 15, moveTime: 900 };
  } else {
    return { skillLevel: 20, depth: 17, moveTime: 1200 };
  }
}

export function getThinkingTimeForElo(elo, moveNumber = 1) {
  const clampedElo = Math.max(250, Math.min(3000, elo));
  const isEarlyOpening = moveNumber <= 3;

  let baseTime;
  let jitter;

  if (clampedElo <= 500) {
    // Martin (250): very fast, impulsive beginner (300ms - 650ms)
    baseTime = 300;
    jitter = 300;
  } else if (clampedElo <= 1150) {
    // Ashutosh_dev (1000): casual, snappy club player (550ms - 1150ms)
    baseTime = 550;
    jitter = 550;
  } else if (clampedElo <= 1750) {
    // Oliver (1500): crafty tactical calculation (1100ms - 1850ms)
    baseTime = 1100;
    jitter = 750;
  } else if (clampedElo <= 2300) {
    // Luna (2000): deep positional calculation (1600ms - 2500ms)
    baseTime = 1600;
    jitter = 900;
  } else {
    // Leo (2600): grandmaster deep evaluation (2200ms - 3600ms)
    baseTime = 2200;
    jitter = 1400;
  }

  if (isEarlyOpening) {
    // Opening book moves are blitzed out ~40% faster
    return Math.floor((baseTime * 0.55) + Math.random() * (jitter * 0.45));
  }

  return Math.floor(baseTime + Math.random() * jitter);
}
