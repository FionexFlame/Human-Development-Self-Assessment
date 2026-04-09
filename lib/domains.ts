import { DomainDefinition } from "@/types";

export const SCALE = [0, 1, 2, 3, 4, 5];

export const SCALE_LABELS: Record<number, string> = {
  0: "Not true for me",
  1: "A little true for me",
  2: "Somewhat true for me",
  3: "Mostly true for me",
  4: "Very true for me",
  5: "True for me almost all the time",
};

export const DOMAINS: DomainDefinition[] = [
  {
    id: "emotional",
    title: "Emotional Containment 🌊",
    definition: "Can I feel hard feelings without exploding, shutting down, or running away?",
    core: [
      "When I feel upset, I do not lose control right away.",
      "When I feel sad, angry, ashamed, or scared, I can stay with the feeling instead of trying to escape it right away.",
      "If someone hurts me, I can pause before I say or do something I regret.",
      "I can tell what I am feeling instead of just saying 'I'm fine' or 'I don't know.'",
      "I do not need to yell, shut down, disappear, or distract myself every time I feel something painful.",
      "Even when I feel strong emotion, I can still see what is really happening."
    ],
    contradictions: [
      "When I get overwhelmed, I quickly do something to not feel it, like scrolling, eating, sleeping, using porn, using substances, or leaving.",
      "When I feel hurt, I often say or do things right away that I wish I had not done later."
    ],
    reflection: "What feeling is hardest for you to sit with, and what do you usually do when it shows up?",
    growth: "Build more pause, naming, and steadiness when strong feelings arise.",
    positiveKeywords: ["pause", "breathe", "name", "journal", "talk", "walk", "pray", "stay", "sit", "calm", "reflect", "regulate"],
    negativeKeywords: ["explode", "shut down", "avoid", "scroll", "porn", "drink", "substances", "run", "leave", "yell", "numb", "binge"]
  },
  {
    id: "relational",
    title: "Relational / Love Capacity 💚",
    definition: "Can I love, trust, connect, and stay honest in close relationships?",
    core: [
      "I can let people get close to me without feeling like I have to hide who I am.",
      "I can care about someone deeply without trying to control them.",
      "When there is conflict, I can talk about it instead of only avoiding it, attacking, or leaving.",
      "I can hear something hard from someone I care about without falling apart or getting mean right away.",
      "I can love someone without making them responsible for my whole worth or happiness.",
      "In close relationships, I can be honest about what I feel and need."
    ],
    contradictions: [
      "When someone pulls away from me, I quickly feel like I am not enough.",
      "I often confuse strong chemistry, attention, or intensity with real love."
    ],
    reflection: "When closeness becomes real, what scares you most?",
    growth: "Practice honest closeness without control, dependency, or retreat.",
    positiveKeywords: ["honest", "talk", "repair", "listen", "trust", "boundaries", "calm", "mutual", "open"],
    negativeKeywords: ["control", "cling", "jealous", "avoid", "ghost", "attack", "need", "panic", "not enough"]
  },
  {
    id: "ego",
    title: "Identity — Relationship to Ego 🪞",
    definition: "How much am I ruled by pride, image, comparison, approval, shame, and defensiveness?",
    core: [
      "When someone corrects me, I can listen without getting defensive right away.",
      "I do not spend a lot of energy trying to look impressive, wise, strong, special, or better than others.",
      "If someone else is doing better than me, I do not lose my sense of self.",
      "I can admit when I am wrong without feeling crushed inside.",
      "Praise feels good, but I do not need it all the time to feel okay.",
      "Criticism can hurt, but it does not completely decide how I feel about myself."
    ],
    contradictions: [
      "I spend a lot of time thinking about how other people see me.",
      "When I feel embarrassed, ignored, or outdone, I react strongly inside even if I hide it."
    ],
    reflection: "What hurts your pride the fastest?",
    growth: "Loosen the grip of image management, comparison, and defensiveness.",
    positiveKeywords: ["accept", "learn", "listen", "humble", "admit", "truth", "okay", "grounded"],
    negativeKeywords: ["defensive", "ashamed", "compare", "prove", "impress", "better", "worse", "ignored"]
  },
  {
    id: "identity",
    title: "Identity — Identity Formation 🌳",
    definition: "Do I know who I am, what I value, and how I want to live?",
    core: [
      "I have a clear sense of what matters to me.",
      "I know what kind of person I want to be.",
      "I do not feel lost all the time about who I am.",
      "I can make choices based on what feels true to me, not only on what other people want.",
      "I usually feel like the same person across different places and different groups of people.",
      "The way I live is slowly becoming more like the person I know I really am."
    ],
    contradictions: [
      "Around different people, I change so much that I sometimes do not know who the real me is.",
      "I often need other people to tell me what I should do, think, or become."
    ],
    reflection: "Where do you feel most like yourself, and where do you lose yourself?",
    growth: "Clarify values and build a more stable, self-authored life direction.",
    positiveKeywords: ["values", "clear", "true", "myself", "consistent", "choose", "know", "direction"],
    negativeKeywords: ["lost", "confused", "change", "please", "approval", "fit in", "don’t know"]
  },
  {
    id: "nervous",
    title: "Nervous System Regulation 🛡️",
    definition: "Does my body know how to calm down and return to balance?",
    core: [
      "After I get stressed, upset, or scared, I can calm down again.",
      "I notice body signs like tightness, fast breathing, shaking, numbness, or panic before things get too out of control.",
      "I have at least one thing that really helps my body calm down, like walking, breathing, prayer, music, movement, rest, or talking to someone safe.",
      "I do not spend most of my life feeling on edge, shut down, or overwhelmed.",
      "My body usually feels like a place I can live in, not something I am trying to escape.",
      "When stress hits, I can still do basic things I need to do."
    ],
    contradictions: [
      "My body often feels stuck in panic, tension, numbness, or exhaustion.",
      "When I get stressed, I often cannot think clearly or function well for a long time."
    ],
    reflection: "When you get stressed, what happens in your body first, and what helps most?",
    growth: "Strengthen body awareness and reliable regulation practices.",
    positiveKeywords: ["breathe", "walk", "rest", "pray", "music", "stretch", "notice", "ground", "calm"],
    negativeKeywords: ["panic", "freeze", "numb", "overwhelmed", "can’t think", "shut down", "spiral"]
  },
  {
    id: "purpose",
    title: "Purpose / Directed Effort 🧭",
    definition: "Can I make myself do what matters even when I do not feel like it?",
    core: [
      "I can make myself start important things without waiting until I feel like it.",
      "I can keep working on something meaningful even when it is hard, boring, slow, or uncomfortable.",
      "I finish more of what matters than I avoid.",
      "My daily life shows effort toward something important to me.",
      "When I fall off track, I can get back on track.",
      "I do not need constant pressure, panic, or other people pushing me in order to act."
    ],
    contradictions: [
      "I often wait for motivation, the perfect mood, or the perfect time before I begin.",
      "I say many things matter to me, but my real actions often do not match that."
    ],
    reflection: "What goal matters most to you right now, and what keeps breaking your follow-through?",
    growth: "Close the gap between what matters and what you actually do.",
    positiveKeywords: ["schedule", "start", "routine", "show up", "follow through", "daily", "consistency", "plan"],
    negativeKeywords: ["procrastinate", "avoid", "motivation", "later", "perfect time", "stuck", "don’t start"]
  },
  {
    id: "integration",
    title: "Integration / Embodied Sovereignty 👑",
    definition: "Do my thoughts, values, feelings, and actions work together, or am I divided against myself?",
    core: [
      "What I say I value and how I actually live are getting closer together.",
      "I can feel what I feel, know what I know, and still choose what is right.",
      "I do not abandon myself just to keep people happy or avoid discomfort.",
      "Different parts of me are working together more than fighting each other.",
      "I trust my own inner knowing without becoming closed off to reality.",
      "I feel more and more like my life is being led from the inside, not just pushed around from the outside."
    ],
    contradictions: [
      "I often know what is right for me but do the opposite anyway.",
      "I often feel split between different parts of myself and do not know which one is really me."
    ],
    reflection: "Where do you most often betray yourself or act against what you know is true?",
    growth: "Live with more internal alignment and less self-betrayal.",
    positiveKeywords: ["aligned", "truth", "values", "choose", "inside", "integrated", "honest", "consistent"],
    negativeKeywords: ["betray", "split", "conflict", "people please", "against myself", "confused"]
  },
  {
    id: "physical",
    title: "Physical Health 🪷",
    definition: "Am I taking care of my body enough for it to support my life?",
    core: [
      "I get enough sleep often enough to function well.",
      "I move my body often enough to help my energy and health.",
      "I eat in a way that mostly helps me feel strong and steady.",
      "I do not ignore my body’s needs over and over again.",
      "My daily habits are helping my health more than hurting it.",
      "I treat my body with basic respect, even if I am not perfect."
    ],
    contradictions: [
      "I often trade my health for comfort, avoidance, chaos, or short-term pleasure.",
      "I know what would help my body, but I rarely do it consistently."
    ],
    reflection: "What is the weakest part of your physical health right now?",
    growth: "Stabilize sleep, food, movement, and recovery enough to support your whole life.",
    positiveKeywords: ["sleep", "walk", "exercise", "water", "protein", "routine", "rest", "stretch"],
    negativeKeywords: ["junk", "late", "no sleep", "skip", "lazy", "chaos", "tired", "ignore"]
  },
  {
    id: "rationality",
    title: "Cognitive Maturation — Grounded Rationality 🐎",
    definition: "Can I think clearly, see reality, and change my mind when needed?",
    core: [
      "I can tell the difference between what I know for sure and what I am guessing.",
      "I can listen to ideas I do not agree with without getting upset right away.",
      "If I find out I was wrong, I can change my mind.",
      "I do not believe something is true just because I strongly feel it.",
      "I try to look at facts, patterns, and reality before making up my mind.",
      "I can think clearly even when a topic is personal or emotional for me."
    ],
    contradictions: [
      "Once I take a side, I do not like changing it even when new facts come in.",
      "I often believe what I want to be true before I check whether it is actually true."
    ],
    reflection: "What kind of truth is hardest for you to accept?",
    growth: "Keep strengthening reality-testing, nuance, and mental flexibility.",
    positiveKeywords: ["facts", "evidence", "reality", "learn", "change my mind", "pattern", "check"],
    negativeKeywords: ["prove", "right", "don’t change", "want", "assume", "bias"]
  },
  {
    id: "creativity",
    title: "Cognitive Maturation — Authentic Creativity 🌀",
    definition: "Can I create from what is real in me instead of copying, hiding, or waiting forever?",
    core: [
      "I let myself make things even if they are not perfect.",
      "What I create feels like it comes from something real in me.",
      "I do more than just think about creating — I actually make things.",
      "I am becoming less afraid to show my real ideas, voice, or style.",
      "I do not only copy what other people are doing; I also try to bring out what is true in me.",
      "My creativity feels connected to real life, real feeling, or something that matters to me."
    ],
    contradictions: [
      "I hide my real ideas because I am afraid people will judge them.",
      "I spend much more time imagining, planning, or consuming other people’s work than actually creating my own."
    ],
    reflection: "What most blocks your creativity right now?",
    growth: "Move from hiding and planning into real expression and repeated creation.",
    positiveKeywords: ["make", "create", "write", "draw", "practice", "show", "real", "express"],
    negativeKeywords: ["fear", "judge", "perfection", "wait", "plan", "consume", "copy", "hide"]
  }
];
