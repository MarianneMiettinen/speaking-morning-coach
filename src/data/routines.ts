import type { Routine } from '../types';

let uid = 0;
function id(prefix: string) {
  uid += 1;
  return `${prefix}-${uid}`;
}

export const routines: Routine[] = [
  {
    id: 'minimum-morning',
    name: 'Minimum Viable Morning',
    description: 'For mornings when functioning is hard. The smallest possible steps.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'SIT UP', instruction: 'Just sit up in bed. Nothing else yet.', speech: 'Let\'s start small. Just sit up in bed. Nothing else needs to happen yet — this is the whole step.', easierVersion: 'Bend one knee.' },
      { id: id('s'), title: 'FEET ON THE FLOOR', instruction: "It's time to get up. Don't plan the day yet.", speech: "It's time to get up. Don't plan the day yet — just put both feet on the floor. That's the entire mission.", easierVersion: 'Move one foot toward the edge of the bed.' },
      { id: id('s'), title: 'STAND UP', instruction: "That's the entire mission.", speech: "Stand up. That's the entire mission — nothing after this needs solving yet.", easierVersion: 'Lean forward and put your hands on the bed.' },
      { id: id('s'), title: 'WALK TO THE BATHROOM', instruction: 'No need to think about anything after that.', speech: 'Walk to the bathroom. No need to think about anything after that — one foot in front of the other is enough.' },
      { id: id('s'), title: 'WASH YOUR FACE', instruction: 'Cold or warm water, your choice.', speech: 'Wash your face. Cold or warm water, whatever feels doable right now. This wakes the body up a little.' },
      { id: id('s'), title: 'DRINK WATER', instruction: 'Fill a glass and drink some.', speech: 'Fill a glass with water and drink some. Your body has been asleep for hours — this is the easiest win of the morning.' },
      { id: id('s'), title: 'PUT CLOTHES ON', instruction: 'Whatever is nearby is fine.', speech: 'Put some clothes on. Whatever is nearby is fine — this is not a decision that needs to be good, just made.', easierVersion: 'Pick up one item of clothing.' },
      { id: id('s'), title: 'OPEN CURTAINS', instruction: 'Let some light in.', speech: 'Open the curtains or blinds. Let some light in — it tells your body the day has actually started.' },
      { id: id('s'), title: 'SIT SOMEWHERE ELSE', instruction: 'Anywhere other than the bed.', speech: 'Go sit somewhere that is not your bed. Anywhere else counts. That\'s the whole routine — you\'re through it.' },
    ],
  },
  {
    id: 'ten-minute-launch',
    name: '10-Minute Launch',
    description: 'Move quickly from bed into functioning, without extra thinking.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'FEET ON THE FLOOR', instruction: 'Both feet down. That starts the clock.', speech: 'Both feet on the floor. That starts the clock — ten minutes from here to fully underway.' },
      { id: id('s'), title: 'STAND AND STRETCH', instruction: 'Reach up for a few seconds.', speech: 'Stand up and stretch your arms up for a few seconds. It wakes the body faster than standing still does.' },
      { id: id('s'), title: 'BATHROOM', instruction: 'Handle the basics.', speech: 'Go to the bathroom and handle the basics — you know what your body needs right now.' },
      { id: id('s'), title: 'BRUSH YOUR TEETH', instruction: "It's good for your teeth, your health, and your morning conversations.", speech: 'Brush your teeth. It matters for your teeth and your health, and it also means your breath is ready for whoever you talk to first today.' },
      { id: id('s'), title: 'DRINK A GLASS OF WATER', instruction: 'Full glass if you can.', speech: 'Drink a full glass of water if you can manage it. It does more for your energy right now than caffeine will.' },
      { id: id('s'), title: 'GET DRESSED', instruction: 'Pick clothes for today, not for the whole week.', speech: 'Get dressed. Just pick something for today — not the whole week, not the perfect outfit, just today.', easierVersion: 'Stand next to your clothes.' },
      { id: id('s'), title: 'EAT SOMETHING SMALL', instruction: 'It does not need to be a full breakfast.', speech: 'Eat something small. It does not need to be a full breakfast — a piece of fruit or a slice of bread is enough fuel to keep moving.', optional: true },
      { id: id('s'), title: 'CHECK THE TIME', instruction: 'Just glance. No planning yet.', speech: 'Glance at the time, just so you know roughly where you stand. No planning yet — just information.' },
      { id: id('s'), title: 'GRAB WHAT YOU NEED TO LEAVE', instruction: 'Keys, bag, phone — whatever today requires.', speech: 'Grab whatever you need to walk out the door today — keys, bag, phone. You\'re basically launched.' },
    ],
  },
  {
    id: 'calm-morning',
    name: 'Calm Morning',
    description: 'Slower and gentler. Useful when feeling overwhelmed or anxious.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'STAY STILL A MOMENT', instruction: 'Notice your breath. No rush.', speech: 'Before anything else, just notice your breath for a moment. There is no rush this morning.' },
      { id: id('s'), title: 'SIT UP SLOWLY', instruction: 'Take your time.', speech: 'Sit up slowly, at whatever pace feels okay. There is nothing to prove by moving fast.' },
      { id: id('s'), title: 'FEET ON THE FLOOR', instruction: 'Feel the floor under your feet for a second.', speech: 'Place both feet on the floor and take a second to actually feel the ground under them. That\'s grounding, quite literally.' },
      { id: id('s'), title: 'STAND WHEN READY', instruction: 'No countdown. Just when it feels okay.', speech: 'Stand up whenever it feels okay to — there\'s no countdown here, just your own pace.' },
      { id: id('s'), title: 'DRINK SOME WATER', instruction: 'Slowly, if you like.', speech: 'Drink a little water, slowly if you like. This is a kind thing to do for your body first thing.' },
      { id: id('s'), title: 'OPEN A WINDOW OR CURTAIN', instruction: 'Let in some air or light.', speech: 'Open a window or curtain. A little air or daylight helps more than it seems like it should.' },
      { id: id('s'), title: 'WASH YOUR FACE', instruction: 'Gently.', speech: 'Wash your face gently. Nothing needs to be rushed about this.' },
      { id: id('s'), title: 'PUT ON COMFORTABLE CLOTHES', instruction: 'Whatever feels okay against your skin today.', speech: 'Put on something comfortable — whatever feels calm against your skin today matters more than how it looks.' },
      { id: id('s'), title: 'NAME ONE THING YOU CAN SEE', instruction: 'Just look around and notice one object.', speech: 'Look around and notice one ordinary object near you. Just that. It brings you gently into the room.' },
      { id: id('s'), title: 'SIT SOMEWHERE CALM', instruction: 'Somewhere other than bed.', speech: 'Go sit somewhere calm, away from the bed. You\'ve arrived in the morning — gently, but you\'ve arrived.' },
    ],
  },
  {
    id: 'workday-launch',
    name: 'Workday Launch',
    description: 'Gets the body moving, then eases into the first five minutes of real work.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'FEET ON THE FLOOR', instruction: 'Both feet down.', speech: 'Both feet on the floor. That\'s the start of a workday, believe it or not.' },
      { id: id('s'), title: 'STAND UP', instruction: 'Nothing to figure out yet.', speech: 'Stand up. Nothing about the workday needs figuring out yet — just this.' },
      { id: id('s'), title: 'BATHROOM AND WASH UP', instruction: 'Handle the basics.', speech: 'Go handle the bathroom basics and wash up a little. You know your own routine here.' },
      { id: id('s'), title: 'DRINK WATER', instruction: 'A full glass if you can.', speech: 'Drink a full glass of water if you can. Better fuel for the brain than jumping straight to coffee.' },
      { id: id('s'), title: 'GET DRESSED FOR THE DAY', instruction: 'Whatever today actually requires.', speech: 'Get dressed for whatever today actually requires — nothing more needs deciding here.', easierVersion: 'Put on one item of clothing.' },
      { id: id('s'), title: 'EAT SOMETHING', instruction: 'Small is fine.', speech: 'Eat something, even something small. Your focus later depends on this more than it feels like right now.', optional: true },
      { id: id('s'), title: 'OPEN YOUR COMPUTER', instruction: 'Just open it. Nothing else yet.', speech: 'Open your computer. Just open it — you do not need to know what you\'re doing yet.' },
      { id: id('s'), title: 'OPEN THE ONE THING YOU PLANNED TO WORK ON', instruction: "You don't need to finish it.", speech: 'Open the one thing you already planned to work on. You don\'t need to finish it, or even understand it fully yet — just open it.' },
      { id: id('s'), title: 'WORK FOR FIVE MINUTES', instruction: 'Only five. That is the whole ask.', speech: 'Work on it for five minutes. Only five — that is the entire ask right now. Most mornings, five minutes is the hard part, and you\'re about to clear it.', estimatedSeconds: 300 },
    ],
  },
  {
    id: 'low-energy-rescue',
    name: 'Low Energy Rescue',
    description: 'Extremely small steps, for the mornings where everything feels heavy.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'SIT UP', instruction: 'Just this.', speech: 'Just sit up. That is genuinely the entire step right now.' },
      { id: id('s'), title: 'FEET DOWN', instruction: 'Let them touch the floor.', speech: 'Let your feet touch the floor. Nothing more is being asked of you yet.' },
      { id: id('s'), title: 'STAND FOR FIVE SECONDS', instruction: 'You can sit back down after.', speech: 'Stand up for about five seconds. You are allowed to sit back down right after — this is just about proving the body can move.' },
      { id: id('s'), title: 'WATER', instruction: 'A few sips.', speech: 'Have a few sips of water. That\'s a real, complete step on a low-energy morning.' },
      { id: id('s'), title: 'LIGHT', instruction: 'Open a curtain or turn on a light.', speech: 'Open a curtain or turn on a light. Let your body register that it is daytime now.' },
      { id: id('s'), title: 'CLOTHES', instruction: 'Change one item, even socks.', speech: 'Change at least one item of clothing — even just socks counts today.', easierVersion: 'Touch the clothes you plan to wear.' },
    ],
  },
  {
    id: 'adventure-mode',
    name: 'Adventure Mode',
    description: 'Same tiny steps, framed like the start of a quest. Playful, not childish.',
    type: 'morning',
    steps: [
      { id: id('s'), title: 'THE QUEST BEGINS', instruction: 'Sit up. Every quest starts with a small move.', speech: 'Every great quest begins the same way: sit up in bed. That\'s it — the story has officially started.' },
      { id: id('s'), title: 'PLANT YOUR FEET', instruction: 'Feet on the floor. You are now grounded for travel.', speech: 'Plant both feet on the floor. Consider yourself now grounded and ready for travel.' },
      { id: id('s'), title: 'RISE', instruction: 'Stand. The hero always stands eventually.', speech: 'Stand up. Every hero in every story eventually has to just stand up — this is that moment for you.' },
      { id: id('s'), title: 'FIND THE WATER SPRING', instruction: 'Also known as your kitchen tap.', speech: 'Locate the ancient water spring — also known as your kitchen tap — and drink from it.' },
      { id: id('s'), title: 'DON YOUR ARMOR', instruction: 'Get dressed for the road ahead.', speech: 'Don your armor for the road ahead — in practical terms, get dressed for today.', easierVersion: 'Pick up one piece of armor.' },
      { id: id('s'), title: 'OPEN THE GATE', instruction: 'Open the curtains. Behold the realm.', speech: 'Open the gate — the curtains, that is — and behold the realm you\'re about to adventure through today.' },
      { id: id('s'), title: 'CHECK YOUR MAP', instruction: 'Glance at the time. No full planning yet.', speech: 'Check your map — just a glance at the time. No full planning of the quest yet, just a bearing.' },
      { id: id('s'), title: 'STEP THROUGH THE DOOR', instruction: 'Leave the sleeping chamber for good this morning.', speech: 'Step through the door of the sleeping chamber, this time for good. The adventure has begun.' },
    ],
  },
];

export function getRoutine(id: string, custom: Routine[]): Routine {
  return (
    routines.find((r) => r.id === id) ??
    custom.find((r) => r.id === id) ??
    routines[0]
  );
}

export { id as makeStepId };
