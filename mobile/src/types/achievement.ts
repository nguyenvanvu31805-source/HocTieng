export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface AchievementSummary {
  total: number;
  unlockedCount: number;
  items: Achievement[];
}
