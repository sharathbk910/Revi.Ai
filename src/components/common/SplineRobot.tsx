import React from 'react';
import { EditorialHeroSchedule } from '../landing/EditorialHeroSchedule';

// Spline robot has been permanently removed per requirement 1.
// Replaced with EditorialHeroSchedule (typography + layout + small technical details).
export const SplineRobot: React.FC<{ className?: string }> = () => {
  return <EditorialHeroSchedule />;
};
