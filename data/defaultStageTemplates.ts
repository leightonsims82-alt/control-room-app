import { BedroomSize, StageTemplate } from '../types/models';

export const defaultHouseTypeId = 'default-template';
export const bedroomOptions = [2, 3, 4, 5] as const;

type BedroomCount = (typeof bedroomOptions)[number];
type StageDurationMap = Record<BedroomCount, number>;

type BedroomStageRow = {
  name: string;
  trade: string;
  durations: StageDurationMap;
  isKeyStage?: boolean;
};

const stageRows: BedroomStageRow[] = [
  { name: 'Substructure', trade: 'Groundworks', durations: { 2: 5, 3: 5, 4: 6, 5: 7 }, isKeyStage: true },
  { name: 'Drainage', trade: 'Groundworks', durations: { 2: 3, 3: 3, 4: 4, 5: 4 }, isKeyStage: true },
  { name: 'Oversite / Slab', trade: 'Groundworks', durations: { 2: 3, 3: 3, 4: 4, 5: 5 }, isKeyStage: true },
  { name: 'First lift brickwork', trade: 'Brickwork', durations: { 2: 5, 3: 6, 4: 7, 5: 8 }, isKeyStage: true },
  { name: 'First lift scaffold', trade: 'Scaffold', durations: { 2: 1, 3: 1, 4: 1, 5: 2 } },
  { name: 'Second lift brickwork', trade: 'Brickwork', durations: { 2: 5, 3: 6, 4: 7, 5: 8 }, isKeyStage: true },
  { name: 'Second lift scaffold', trade: 'Scaffold', durations: { 2: 1, 3: 1, 4: 1, 5: 2 } },
  { name: 'Joist and flooring', trade: 'Joinery', durations: { 2: 2, 3: 2, 4: 3, 5: 3 }, isKeyStage: true },
  { name: 'Third lift brickwork', trade: 'Brickwork', durations: { 2: 5, 3: 6, 4: 7, 5: 8 }, isKeyStage: true },
  { name: 'Third lift scaffold', trade: 'Scaffold', durations: { 2: 1, 3: 1, 4: 1, 5: 2 } },
  { name: 'Roof structure / trusses', trade: 'Roofing', durations: { 2: 3, 3: 3, 4: 4, 5: 5 }, isKeyStage: true },
  { name: 'Roof covering', trade: 'Roofing', durations: { 2: 3, 3: 4, 4: 5, 5: 6 } },
  { name: 'Strip bird cage', trade: 'Scaffold', durations: { 2: 1, 3: 1, 4: 1, 5: 1 } },
  { name: 'Windows and doors', trade: 'Joinery', durations: { 2: 2, 3: 2, 4: 3, 5: 3 }, isKeyStage: true },
  { name: 'First fix carpentry', trade: 'Joinery', durations: { 2: 3, 3: 4, 4: 5, 5: 6 } },
  { name: 'First fix plumbing', trade: 'Plumbing', durations: { 2: 3, 3: 3, 4: 4, 5: 5 } },
  { name: 'First fix electrics', trade: 'Electrical', durations: { 2: 3, 3: 3, 4: 4, 5: 5 } },
  { name: 'Insulation', trade: 'Drylining', durations: { 2: 2, 3: 2, 4: 3, 5: 3 }, isKeyStage: true },
  { name: 'Drylining', trade: 'Drylining', durations: { 2: 3, 3: 4, 4: 5, 5: 6 } },
  { name: 'Plastering', trade: 'Plastering', durations: { 2: 4, 3: 5, 4: 6, 5: 7 } },
  { name: 'Patching', trade: 'Plastering', durations: { 2: 2, 3: 2, 4: 3, 5: 3 } },
  { name: 'Decoration', trade: 'Decoration', durations: { 2: 5, 3: 6, 4: 7, 5: 8 } },
  { name: 'Second fix carpentry', trade: 'Joinery', durations: { 2: 3, 3: 4, 4: 5, 5: 6 } },
  { name: 'Second fix plumbing', trade: 'Plumbing', durations: { 2: 2, 3: 3, 4: 3, 5: 4 } },
  { name: 'Second fix electrics', trade: 'Electrical', durations: { 2: 2, 3: 3, 4: 3, 5: 4 } },
  { name: 'Flooring', trade: 'Flooring', durations: { 2: 2, 3: 2, 4: 3, 5: 3 } },
  { name: 'Decoration after flooring', trade: 'Decoration', durations: { 2: 2, 3: 2, 4: 3, 5: 3 } },
  { name: 'Build clean', trade: 'Finishing', durations: { 2: 1, 3: 1, 4: 1, 5: 2 } },
  { name: 'Snag patch', trade: 'Finishing', durations: { 2: 2, 3: 2, 4: 3, 5: 3 }, isKeyStage: true },
  { name: 'Snag decoration', trade: 'Decoration', durations: { 2: 2, 3: 2, 4: 3, 5: 3 }, isKeyStage: true },
  { name: 'Sparkle clean', trade: 'Finishing', durations: { 2: 1, 3: 1, 4: 1, 5: 1 } },
  { name: 'Pre-handover / paint touch-ups', trade: 'Finishing', durations: { 2: 1, 3: 1, 4: 1, 5: 2 }, isKeyStage: true },
];

function bedroomCountFromSize(bedroomSize?: BedroomSize | number): BedroomCount {
  const parsed = typeof bedroomSize === 'number' ? bedroomSize : Number(String(bedroomSize ?? '3').replace(/\D/g, ''));
  return bedroomOptions.includes(parsed as BedroomCount) ? (parsed as BedroomCount) : 3;
}

export function getDefaultStageTemplates(bedroomSize?: BedroomSize | number, houseTypeId = defaultHouseTypeId): StageTemplate[] {
  const bedroomCount = bedroomCountFromSize(bedroomSize);

  return stageRows.map((row, index) => ({
    id: `tpl-${String(index + 1).padStart(3, '0')}`,
    name: row.name,
    trade: row.trade,
    durationDays: row.durations[bedroomCount],
    order: index + 1,
    houseTypeId,
    isKeyStage: Boolean(row.isKeyStage),
  }));
}

export const defaultStageTemplates: StageTemplate[] = getDefaultStageTemplates(3);
