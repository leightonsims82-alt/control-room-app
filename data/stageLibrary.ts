export type StageLibraryGroup = {
  group: string;
  stages: string[];
};

export const stageLibraryGroups: StageLibraryGroup[] = [
  {
    group: 'External & Shell',
    stages: [
      'Substructure',
      'Drainage',
      'Oversite / Slab',
      'First lift brickwork',
      'First lift scaffold',
      'Second lift brickwork',
      'Second lift scaffold',
      'Joist and flooring',
      'Third lift brickwork',
      'Third lift scaffold',
      'Fourth lift brickwork',
      'Fourth lift scaffold',
      'Roof structure / trusses',
      'Gables',
      'Roof covering',
      'Strip bird cage',
      'Windows and doors',
    ],
  },
  {
    group: 'Internal First Fix',
    stages: [
      'First fix carpentry',
      'First fix plumbing',
      'First fix electrics',
      'First fix sprinkler',
    ],
  },
  {
    group: 'Internal Mid',
    stages: [
      'Insulation',
      'Drylining',
      'Plastering',
      'Patching',
      'Sanding',
      'Decoration',
    ],
  },
  {
    group: 'Internal Second Fix & Finals',
    stages: [
      'Second fix carpentry',
      'Second fix plumbing',
      'Second fix electrics',
      'Second fix sprinkler',
      'Electrical finals',
      'Plumbing finals',
      'Carpentry finals',
      'Sprinkler finals',
    ],
  },
  {
    group: 'Finishing & Close Out',
    stages: [
      'Snag patch',
      'Snag decoration',
      'Flooring',
      'Decoration after flooring',
      'Build clean',
      'Re-clean',
      'Sparkle clean',
      'Pre-handover / paint touch-ups',
    ],
  },
];

export const allStageLibraryNames = stageLibraryGroups.flatMap((group) => group.stages);
