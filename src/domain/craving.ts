export interface BreathingPhase {
  name: 'Inhale' | 'Hold' | 'Exhale';
  durationSec: number;
}

export interface BreathingPattern {
  id: '4-7-8' | 'box';
  name: string;
  description: string;
  phases: BreathingPhase[];
  totalCycleSec: number;
}

export const BREATHING_PATTERNS: Record<'4-7-8' | 'box', BreathingPattern> = {
  '4-7-8': {
    id: '4-7-8',
    name: '4-7-8 Calming Breath',
    description: 'Dr. Andrew Weil method that stimulates the vagus nerve and lowers heart rate.',
    phases: [
      { name: 'Inhale', durationSec: 4 },
      { name: 'Hold', durationSec: 7 },
      { name: 'Exhale', durationSec: 8 },
    ],
    totalCycleSec: 19,
  },
  box: {
    id: 'box',
    name: 'Box Breathing (4-4-4-4)',
    description: 'Tactical regulation used by emergency responders to quickly reduce panic and stress.',
    phases: [
      { name: 'Inhale', durationSec: 4 },
      { name: 'Hold', durationSec: 4 },
      { name: 'Exhale', durationSec: 4 },
      { name: 'Hold', durationSec: 4 },
    ],
    totalCycleSec: 16,
  },
};

export const URGE_SURFING_PROMPTS = [
  'Observe the urge without judgment. You do not have to fight it.',
  'Cravings are bodily sensations, not commands. You are the observer.',
  'Like an ocean wave, every urge rises, peaks, and naturally dissolves.',
  'Notice where the sensation sits in your body—chest, throat, or palms—and breathe into it.',
  'This craving has no power to make you smoke. You hold 100% of your actions.',
  'Most cravings crest and begin receding within 180 to 300 seconds.',
  'Every single urge you surf permanently rewires nicotine pathways in your brain.',
  'You have survived every craving you have ever faced. You are winning right now.',
];

export interface GroundingStep {
  step: number;
  count: number;
  sense: string;
  instruction: string;
  icon: string;
}

export const GROUNDING_54321_STEPS: GroundingStep[] = [
  {
    step: 1,
    count: 5,
    sense: 'Sight',
    instruction: 'Acknowledge 5 distinct things you see around you right now.',
    icon: 'eye-outline',
  },
  {
    step: 2,
    count: 4,
    sense: 'Touch',
    instruction: 'Acknowledge 4 things you can physically feel (feet on floor, clothes on skin).',
    icon: 'hand-left-outline',
  },
  {
    step: 3,
    count: 3,
    sense: 'Hearing',
    instruction: 'Acknowledge 3 subtle sounds you can hear in the distance or room.',
    icon: 'volume-medium-outline',
  },
  {
    step: 4,
    count: 2,
    sense: 'Smell',
    instruction: 'Acknowledge 2 scents in the air (coffee, breeze, fresh soap).',
    icon: 'flower-outline',
  },
  {
    step: 5,
    count: 1,
    sense: 'Taste',
    instruction: 'Acknowledge 1 taste in your mouth (mint, water, lingering flavor).',
    icon: 'cafe-outline',
  },
];

export interface FourDItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const FOUR_DS_CHECKLIST: FourDItem[] = [
  {
    id: 'delay',
    title: 'Delay for 5 Minutes',
    description: 'Tell yourself you will wait just 5 minutes. The craving peak will collapse.',
    icon: 'time-outline',
  },
  {
    id: 'deep_breath',
    title: 'Deep Breathing',
    description: 'Take 3 slow, deep abdominal breaths to drop cortisol.',
    icon: 'fitness-outline',
  },
  {
    id: 'drink_water',
    title: 'Drink Cold Water',
    description: 'Sip a glass of ice-cold water slowly to stimulate the vagus nerve.',
    icon: 'water-outline',
  },
  {
    id: 'distract',
    title: 'Distract Hands & Mind',
    description: 'Change rooms, wash your hands, stretch, or do a quick physical task.',
    icon: 'walk-outline',
  },
];

export function getIntensityLabel(intensity: number): {
  label: string;
  colorType: 'success' | 'warning' | 'danger';
  advice: string;
} {
  if (intensity <= 3) {
    return {
      label: 'Mild Urge',
      colorType: 'success',
      advice: 'A few deep breaths or a sip of cold water will easily disperse this.',
    };
  }
  if (intensity <= 6) {
    return {
      label: 'Moderate Urge',
      colorType: 'warning',
      advice: 'The habitual trigger is active. Surf the wave with calm attention.',
    };
  }
  if (intensity <= 8) {
    return {
      label: 'Intense Craving',
      colorType: 'danger',
      advice: 'Your brain is actively rewiring. Hold steady; peak lasts under 3 minutes.',
    };
  }
  return {
    label: 'Peak Urge',
    colorType: 'danger',
    advice: 'Full neurological storm. Do not fight it. Observe it like an outside storm.',
  };
}

export function calculateIntensityDelta(before: number, after: number): number {
  return before - after;
}
