import { KeyStageInspectionTemplate } from '../types/models';

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
