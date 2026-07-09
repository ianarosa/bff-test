// questionBank.js — the pool of ready-made questions the create view offers.
// Each entry is { text, options:[...] } — NO answer (the creator supplies that
// by tapping). DEFAULT_QUESTIONS are the 10 shown by default; ALTERNATES is an
// extra pool a future "swap this question" dropdown can pull from.

export const DEFAULT_QUESTIONS = [
  {
    text: "What's my ride-or-die favorite snack? 🍿",
    options: ['Salty chips + dip 🥔', 'Chocolate anything 🍫', 'Spicy hot cheetos 🌶️', "Fresh fruit, I'm fancy 🍓"],
  },
  {
    text: "Where's my dream vacation? ✈️",
    options: ['Tropical beach, no wifi 🏝️', 'Big city lights 🌃', 'Cozy mountain cabin 🏔️', 'Backpacking chaos 🎒'],
  },
  {
    text: "What's my go-to emoji? 💬",
    options: ["💀 (I'm dead)", '😭 (crying-laughing)', '✨ (sparkle everything)', '🥺 (pleading eyes)'],
  },
  {
    text: 'My 2AM midnight snack of choice? 🌙',
    options: ['Cereal, dry or wet 🥣', 'Leftover cold pizza 🍕', 'Ice cream from the tub 🍦', 'A whole sleeve of cookies 🍪'],
  },
  {
    text: 'My ideal weekend looks like? 🗓️',
    options: ["Party 'til sunrise 🪩", 'Blanket + shows all day 🛋️', 'Outdoor adventure 🥾', 'Brunch then a nap 🥐'],
  },
  {
    text: "What's my coffee order? ☕",
    options: ['Black, no nonsense ⚫', 'Iced caramel everything 🧊', 'Oat milk matcha 🍵', 'Give me an energy drink 🥤'],
  },
  {
    text: 'What genre HYPES me up? 🎧',
    options: ['Pop bangers 🎤', 'Rap / hip-hop 🔥', 'Throwback 2000s 📼', 'Indie sad girl 🎸'],
  },
  {
    text: "What's my BIGGEST ick? 😬",
    options: ['Slow walkers 🐌', 'Being left on read 📵', 'Loud chewers 😖', 'Bad texting grammar 🔤'],
  },
  {
    text: "What's my spirit animal? 🐾",
    options: ['Chaotic cat 🐈', 'Loyal golden pup 🐕', 'Sleepy sloth 🦥', 'Unbothered capybara 🦫'],
  },
  {
    text: "What's my texting style? ⌨️",
    options: ['Paragraphs, every time 📜', 'One word. k. 🥶', 'All emojis no words 🙃', 'Voice memos only 🎙️'],
  },
];

// Extra questions the "swap this one out" dropdown pulls from. Same shape
// ({ text, options[] }, no answer). Keep this a healthy, punchy pool so swapping
// always has fresh variety.
export const ALTERNATES = [
  {
    text: "What's my toxic trait? 😈",
    options: ['Always late ⏰', 'Never texts back 📴', 'Too competitive 🏆', 'Overthinks everything 🌀'],
  },
  {
    text: 'Pick my perfect first date 💘',
    options: ['Fancy dinner 🍽️', 'Arcade + snacks 🕹️', 'Long walk + talk 🌆', 'Netflix on the couch 🍿'],
  },
  {
    text: "What's my dream pet? 🐶",
    options: ['Golden retriever 🦮', 'Sassy cat 😼', 'Tiny hamster 🐹', 'Something exotic 🦎'],
  },
  {
    text: 'My go-to karaoke song is… 🎤',
    options: ['A power ballad 🎶', 'Early 2000s pop 💿', 'Rap I forget halfway 🎧', "I do NOT sing 🙅"],
  },
  {
    text: 'How do I take my pizza? 🍕',
    options: ['Pepperoni classic 🥩', 'Pineapple, fight me 🍍', 'Loaded veggies 🥬', 'Extra cheese only 🧀'],
  },
  {
    text: "What's my love language? 💫",
    options: ['Words of affirmation 💬', 'Quality time ⏳', 'Gifts 🎁', 'Physical touch 🤗'],
  },
  {
    text: 'My phone battery is usually at… 🔋',
    options: ['100%, always ready ⚡', 'A comfy 50% 😌', 'Danger zone, 12% 😰', 'It died hours ago 💀'],
  },
  {
    text: "What's my comfort show? 📺",
    options: ['A cozy sitcom 😂', 'True crime docs 🔪', 'Reality TV drama 🎭', 'Anime marathons 🍥'],
  },
  {
    text: "What's my secret hidden talent? 🌟",
    options: ['Weirdly good memory 🧠', 'Can cook anything 🍳', 'Impressions + accents 🎭', 'Winning at any game 🎯'],
  },
  {
    text: 'How do I handle a horror movie? 👻',
    options: ['Eyes wide, love it 😍', 'Peeking through fingers 🫣', 'Nervous laughing 😅', 'Hard pass, no thanks 🙅'],
  },
  {
    text: 'If I had ONE superpower? ⚡',
    options: ['Teleport anywhere 🌍', 'Read minds 🧠', 'Freeze time ⏸️', 'Fly, obviously 🕊️'],
  },
  {
    text: "What's my morning vibe? 🌅",
    options: ['Up at 6, gym-ready 💪', 'Snooze x5, then chaos 😵', 'Silent until coffee ☕', 'Never a morning person 🌙'],
  },
  {
    text: 'My group-chat role is… 💬',
    options: ['The meme dealer 😂', 'The planner 📅', 'The ghost (read, no reply) 👻', 'The 3AM overthinker 🌀'],
  },
  {
    text: "What's my shopping style? 🛍️",
    options: ['Cart full, buy nothing 🛒', 'Impulse buyer 💸', 'Research for weeks 🔍', 'Only when it\'s on sale 🏷️'],
  },
];
