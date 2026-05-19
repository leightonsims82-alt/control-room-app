import { StageTemplate } from '../types/models';

export const defaultHouseTypeId = 'default-template';

const stageRows = [
  ['Substructure', 'Groundworks', 5, true],
  ['Drainage', 'Groundworks', 3, false],
  ['Oversite / Slab', 'Groundworks', 3, true],
  ['First lift brickwork', 'Brickwork', 6, false],
  ['First lift scaffold', 'Scaffold', 1, false],
  ['Second lift brickwork', 'Brickwork', 6, false],
  ['Second lift scaffold', 'Scaffold', 1, false],
  ['Joist and flooring', 'Joinery', 2, true],
  ['Third lift brickwork', 'Brickwork', 6, false],
  ['Third lift scaffold', 'Scaffold', 1, false],
  ['Roof structure / trusses', 'Roofing', 3, true],
  ['Roof covering', 'Roofing', 4, false],
  ['Strip bird cage', 'Scaffold', 1, false],
  ['Windows and doors', 'Joinery', 2, true],
  ['First fix carpentry', 'Joinery', 4, false],
  ['First fix plumbing', 'Plumbing', 3, false],
  ['First fix electrics', 'Electrical', 3, false],
  ['Insulation', 'Drylining', 2, true],
  ['Drylining', 'Drylining', 4, false],
  ['Plastering', 'Plastering', 5, false],
  ['Patching', 'Plastering', 2, false],
  ['Decoration', 'Decoration', 6, false],
  ['Second fix carpentry', 'Joinery', 4, false],
  ['Second fix plumbing', 'Plumbing', 3, false],
  ['Second fix electrics', 'Electrical', 3, false],
  ['Flooring', 'Flooring', 2, false],
  ['Decoration after flooring', 'Decoration', 2, false],
  ['Build clean', 'Finishing', 1, false],
  ['Snag patch', 'Finishing', 2, false],
  ['Snag decoration', 'Decoration', 2, false],
  ['Sparkle clean', 'Finishing', 1, false],
  ['Pre-handover paint touch-ups', 'Finishing', 1, true],
] as const;

export const defaultStageTemplates: StageTemplate[] = stageRows.map((row, index) => ({
  id: `tpl-${String(index + 1).padStart(3, '0')}`,
  name: row[0],
  trade: row[1],
  durationDays: row[2],
  order: index + 1,
  houseTypeId: defaultHouseTypeId,
  isKeyStage: row[3],
}));
