import { KeyStageInspectionTemplate } from '../types/models';

const nhbc62 = {
  id: 'nhbc-6-2-8',
  source: 'NHBC Standards 2026' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Chapter 6.2',
  title: 'External timber framed walls, differential movement',
};

const nhbc31 = {
  id: 'nhbc-3-1-9-3',
  source: 'NHBC Standards 2026' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Chapter 3.1',
  title: 'Concrete and its reinforcement, concrete cover',
};

export const timberFrameInspectionTemplates: KeyStageInspectionTemplate[] = [
  {
    id: 'timber-frame-substructure-interface',
    keyStageName: 'Timber Frame Substructure Interface',
    matchedStageNames: ['Substructure', 'Oversite / Slab', 'Slab'],
    description: 'Checks before timber frame delivery and installation, focused on slab accuracy, DPC, sole plate support and readiness for frame erection.',
    items: [
      { id: 'tf-sub-001', trade: 'Groundworks', check: 'Slab or substructure dimensions suitable for timber frame setting out' },
      { id: 'tf-sub-002', trade: 'Groundworks', check: 'Sole plate bearing area level and suitable' },
      { id: 'tf-sub-003', trade: 'Groundworks', check: 'DPC or gas membrane details complete and protected where required' },
      { id: 'tf-sub-004', trade: 'Groundworks', check: 'Holding down strap, anchor or fixing positions prepared where required' },
      { id: 'tf-sub-005', trade: 'Groundworks', check: 'Service penetrations set out and protected before frame installation' },
      { id: 'tf-sub-006', trade: 'Groundworks', check: 'Frame delivery and crane/access requirements considered' },
      {
        id: 'tf-sub-007',
        trade: 'Groundworks',
        check: 'Concrete cover to reinforcement checked where reinforcement is present and not engineer-designed',
        references: [nhbc31],
        tolerance: {
          ruleId: 'concrete-cover-not-engineered',
          label: 'Concrete cover to reinforcement',
          prompt: 'Is the measured concrete cover equal to or greater than the required minimum cover for the concrete position?',
          unit: 'mm',
          measurementRequired: true,
          values: {
            'In contact with the ground': '75mm minimum cover',
            'External conditions': '50mm minimum cover',
            'Cast against DPM on sand blinding': '40mm minimum cover',
            'Against adequate blinding concrete': '40mm minimum cover',
            'Protected or internal conditions': '25mm minimum cover',
          },
        },
      },
    ],
  },
  {
    id: 'timber-frame-erection',
    keyStageName: 'Timber Frame Erection',
    matchedStageNames: ['Timber frame', 'Frame erection', 'Superstructure', 'First lift brickwork', 'Second lift brickwork', 'Third lift brickwork', 'Fourth lift brickwork', 'Gables brickwork'],
    description: 'Timber frame checks for panels, sole plates, straps, bracing, fire stopping and external envelope readiness.',
    items: [
      { id: 'tf-frame-001', trade: 'Timber Frame', check: 'Sole plates correctly positioned, fixed and level' },
      { id: 'tf-frame-002', trade: 'Timber Frame', check: 'Timber frame panels installed to layout and plumb' },
      { id: 'tf-frame-003', trade: 'Timber Frame', check: 'Panel joints, fixings and connections completed to design requirements' },
      { id: 'tf-frame-004', trade: 'Timber Frame', check: 'Temporary and permanent bracing installed where required' },
      { id: 'tf-frame-005', trade: 'Timber Frame', check: 'Holding down straps, restraint straps and anchors installed where required' },
      { id: 'tf-frame-006', trade: 'Timber Frame', check: 'Cavity barriers and fire stopping installed at required locations' },
      { id: 'tf-frame-007', trade: 'Timber Frame', check: 'Openings formed correctly and ready for windows and doors' },
      { id: 'tf-frame-008', trade: 'Timber Frame', check: 'Frame protected from weather and standing water' },
      {
        id: 'tf-frame-009',
        trade: 'Timber Frame',
        check: 'Differential movement gap allowed at window heads, window sills, eaves, verges and masonry cladding interfaces',
        references: [nhbc62],
        tolerance: {
          ruleId: 'tf-differential-movement-masonry-cladding',
          label: 'Differential movement gap with masonry cladding',
          prompt: 'Is the measured differential movement gap within the required allowance for the storey level and joist type?',
          unit: 'mm',
          measurementRequired: true,
          values: {
            'Ground floor or lowest level': '5mm solid timber joists / 5mm engineered I-joists',
            'First floor': '20mm solid timber joists / 15mm engineered I-joists',
            'Second floor': '35mm solid timber joists / 25mm engineered I-joists',
            'Third floor': '45mm solid timber joists / 35mm engineered I-joists',
            'Fourth floor': '45mm solid timber joists / check project design where table assumptions do not apply',
            'Fifth floor': 'Specialist/project calculations may be required',
            'Sixth floor and above': 'Specialist calculations to be submitted to NHBC',
            'Eaves/verge': 'Add 5mm to the gap dimension at the level below',
          },
        },
      },
    ],
  },
  {
    id: 'timber-frame-pre-plaster',
    keyStageName: 'Timber Frame Pre Plaster',
    matchedStageNames: ['Insulation', 'Pre Plaster', 'Drylining'],
    description: 'Pre-plaster checks for timber frame before internal lining closes concealed areas.',
    items: [
      { id: 'tf-pre-001', trade: 'Timber Frame', check: 'Frame moisture condition acceptable before closing up' },
      { id: 'tf-pre-002', trade: 'Drylining', check: 'Insulation fitted correctly with no gaps or compression' },
      { id: 'tf-pre-003', trade: 'Drylining', check: 'Vapour control layer installed and sealed where required' },
      { id: 'tf-pre-004', trade: 'Multi-trade', check: 'Fire stopping and cavity barriers visible and complete before lining' },
      { id: 'tf-pre-005', trade: 'Multi-trade', check: 'Service penetrations sealed and protected where required' },
      { id: 'tf-pre-006', trade: 'Drylining', check: 'Service voids, pattresses and fixing zones complete before boarding' },
    ],
  },
];

export const steelFrameInspectionTemplates: KeyStageInspectionTemplate[] = [
  {
    id: 'steel-frame-erection',
    keyStageName: 'Steel Frame Erection',
    matchedStageNames: ['Steel frame', 'Frame erection', 'Superstructure'],
    description: 'Steel frame checks for line, level, fixings, bracing and fire protection readiness.',
    items: [
      { id: 'sf-frame-001', trade: 'Steel Frame', check: 'Frame installed to line, level and plumb' },
      { id: 'sf-frame-002', trade: 'Steel Frame', check: 'Base plates, anchors and fixings installed correctly' },
      { id: 'sf-frame-003', trade: 'Steel Frame', check: 'Temporary and permanent bracing installed where required' },
      { id: 'sf-frame-004', trade: 'Steel Frame', check: 'Connections complete and accessible for inspection' },
      { id: 'sf-frame-005', trade: 'Steel Frame', check: 'Fire protection or encasement requirements identified before closing up' },
    ],
  },
];
