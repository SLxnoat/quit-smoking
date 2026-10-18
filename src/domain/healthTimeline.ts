export interface HealthMilestone {
  id: string;
  title: string;
  thresholdSeconds: number;
  timeLabel: string;
  description: string;
  source: string;
  category: 'cardiovascular' | 'respiratory' | 'systemic';
}

export interface HealthMilestoneProgress extends HealthMilestone {
  isCompleted: boolean;
  progress: number; // 0 to 1
  secondsRemaining: number;
}

export const HEALTH_RECOVERY_TIMELINE: HealthMilestone[] = [
  {
    id: 'health_20m',
    title: 'Pulse & Blood Pressure Normalizing',
    thresholdSeconds: 20 * 60, // 1,200s
    timeLabel: '20 minutes',
    description: 'Heart rate and blood pressure begin dropping toward healthy baseline levels.',
    source: 'WHO / NHS Smokefree',
    category: 'cardiovascular',
  },
  {
    id: 'health_8h',
    title: 'Carbon Monoxide Halved',
    thresholdSeconds: 8 * 3600, // 28,800s
    timeLabel: '8 hours',
    description: 'Carbon monoxide in your bloodstream has decreased by half; oxygen levels are climbing back to normal.',
    source: 'NHS / CDC',
    category: 'cardiovascular',
  },
  {
    id: 'health_12h',
    title: 'Carbon Monoxide Cleared',
    thresholdSeconds: 12 * 3600, // 43,200s
    timeLabel: '12 hours',
    description: 'Blood carbon monoxide level drops to normal; cellular oxygenation reaches optimal capacity.',
    source: 'US Surgeon General',
    category: 'cardiovascular',
  },
  {
    id: 'health_24h',
    title: 'Heart Attack Risk Begins to Drop',
    thresholdSeconds: 24 * 3600, // 86,400s
    timeLabel: '24 hours',
    description: 'Your risk of acute myocardial infarction (heart attack) begins to measurably decrease.',
    source: 'American Heart Association',
    category: 'cardiovascular',
  },
  {
    id: 'health_48h',
    title: 'Taste & Smell Reawakening',
    thresholdSeconds: 48 * 3600, // 172,800s
    timeLabel: '48 hours',
    description: 'Damaged nerve endings start to regrow. Your ability to taste and smell food becomes noticeably sharper.',
    source: 'CDC',
    category: 'systemic',
  },
  {
    id: 'health_72h',
    title: '100% Nicotine-Free Body',
    thresholdSeconds: 72 * 3600, // 259,200s
    timeLabel: '72 hours',
    description: 'Nicotine is completely eliminated from your body. Bronchial tubes begin to relax, making breathing easier.',
    source: 'NHS Smokefree',
    category: 'respiratory',
  },
  {
    id: 'health_2w',
    title: 'Enhanced Circulation & Mobility',
    thresholdSeconds: 14 * 86400, // 1,209,600s
    timeLabel: '2 weeks',
    description: 'Blood flow and peripheral circulation improve dramatically. Walking, running, and climbing stairs feel easier.',
    source: 'US Surgeon General',
    category: 'cardiovascular',
  },
  {
    id: 'health_1m',
    title: 'Coughing & Congestion Clear',
    thresholdSeconds: 30 * 86400, // 2,592,000s
    timeLabel: '1 month',
    description: 'Cilia in the lungs have regained normal function, effectively clearing mucus and reducing infection risk.',
    source: 'American Lung Association',
    category: 'respiratory',
  },
  {
    id: 'health_3m',
    title: 'Lung Capacity Increased by 10%',
    thresholdSeconds: 90 * 86400, // 7,776,000s
    timeLabel: '3 months',
    description: 'Lung function and breathing capacity have increased by up to 10%. Chronic shortness of breath is fading.',
    source: 'NHS / Cochrane',
    category: 'respiratory',
  },
  {
    id: 'health_6m',
    title: 'Airway Healing & Stress Reduction',
    thresholdSeconds: 180 * 86400, // 15,552,000s
    timeLabel: '6 months',
    description: 'Lungs are substantially healed. Daily stress and anxiety levels are lower than when dependent on nicotine.',
    source: 'British Medical Journal',
    category: 'systemic',
  },
  {
    id: 'health_1y',
    title: 'Coronary Heart Disease Risk Halved',
    thresholdSeconds: 365 * 86400, // 31,536,000s
    timeLabel: '1 year',
    description: 'Your excess risk of coronary heart disease is now cut in half compared to a continuing smoker.',
    source: 'WHO / CDC',
    category: 'cardiovascular',
  },
  {
    id: 'health_5y',
    title: 'Stroke Risk Equals Non-Smoker',
    thresholdSeconds: 5 * 365 * 86400, // 157,680,000s
    timeLabel: '5 years',
    description: 'Your risk of having a stroke is reduced to that of someone who has never smoked.',
    source: 'US Surgeon General 2020',
    category: 'cardiovascular',
  },
  {
    id: 'health_10y',
    title: 'Lung Cancer Risk Cut by 50%',
    thresholdSeconds: 10 * 365 * 86400, // 315,360,000s
    timeLabel: '10 years',
    description: 'Your risk of dying from lung cancer is roughly half that of a smoker. Risks of mouth and throat cancers drop.',
    source: 'WHO Tobacco Factsheet',
    category: 'respiratory',
  },
  {
    id: 'health_15y',
    title: 'Complete Cardiovascular Recovery',
    thresholdSeconds: 15 * 365 * 86400, // 473,040,000s
    timeLabel: '15 years',
    description: 'Your risk of coronary heart disease is now equivalent to that of a lifelong non-smoker.',
    source: 'American Heart Association / CDC',
    category: 'cardiovascular',
  },
];

export function getHealthRecoveryProgress(elapsedSeconds: number): HealthMilestoneProgress[] {
  let prevThreshold = 0;

  return HEALTH_RECOVERY_TIMELINE.map((milestone) => {
    const isCompleted = elapsedSeconds >= milestone.thresholdSeconds;
    const secondsRemaining = Math.max(0, milestone.thresholdSeconds - elapsedSeconds);

    let progress: number;
    if (isCompleted) {
      progress = 1;
    } else if (elapsedSeconds <= prevThreshold) {
      progress = 0;
    } else {
      const window = milestone.thresholdSeconds - prevThreshold;
      const completedInWindow = elapsedSeconds - prevThreshold;
      progress = Math.min(1, Math.max(0, completedInWindow / window));
    }

    prevThreshold = milestone.thresholdSeconds;

    return {
      ...milestone,
      isCompleted,
      progress,
      secondsRemaining,
    };
  });
}

export function getNextHealthMilestone(
  elapsedSeconds: number
): HealthMilestoneProgress | null {
  const list = getHealthRecoveryProgress(elapsedSeconds);
  return list.find((m) => !m.isCompleted) ?? null;
}
