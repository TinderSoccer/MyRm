// Lucide icons at stroke-width 2.75, as the Organic system asks, plus the box's own kit drawn on the same 24px grid
// and stroke: barbell, kettlebell, rings, plyo box, whiteboard, stopwatch.
const PATHS = {
  /** Olympic bar from the side: the long bar, a big and a small plate each side (thin, so it never reads as a dumbbell). */
  barbell: (
    <>
      <path d="M1 12h22" />
      <path d="M6 7v10M3.5 9v6M18 7v10M20.5 9v6" />
    </>
  ),
  /** A round bell with the handle arching out of its shoulders (straight legs would make it a padlock). */
  kettlebell: (
    <>
      <circle cx="12" cy="15" r="6" />
      <path d="M7.4 11.2C5.8 5 18.2 5 16.6 11.2" />
    </>
  ),
  /** Gymnastics rings on their straps. */
  rings: (
    <>
      <path d="M7.5 2v9M16.5 2v9" />
      <circle cx="7.5" cy="15.5" r="4.5" />
      <circle cx="16.5" cy="15.5" r="4.5" />
    </>
  ),
  /** The plyo box: "the box" is what CrossFitters call their gym. */
  box: (
    <>
      <path d="M3 9l9-5 9 5v8l-9 5-9-5z" />
      <path d="M3 9l9 5 9-5M12 14v8" />
    </>
  ),
  /** The WOD whiteboard on its easel. */
  board: (
    <>
      <rect x="3" y="3" width="18" height="13" rx="2" />
      <path d="M7 7.5h6M7 11h9M8.5 21l2-5M15.5 21l-2-5" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  timer: (
    <>
      <path d="M10 2h4" />
      <path d="M12 14l3-3" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  minus: <path d="M5 12h14" />,
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  )
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
