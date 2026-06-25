import { KeyStageInspectionTemplate, KeyStageInspectionTemplateItem } from '../types/models';

const nhbc91 = {
  id: 'nhbc-9-1-3-3',
  source: 'NHBC Standards 2026' as const,
  jurisdiction: 'Both' as const,
  partOrChapter: 'Chapter 9.1',
  title: 'A consistent approach to finishes, tolerances for boxings',
};

export const checklistTemplateEnhancements: Record<string, KeyStageInspectionTemplateItem[]> = {
  drylining: [
    {
      id: 'drylining-boxing-tolerance-001',
      trade: 'Drylining',
      check: 'Boxings, duct casings and access panel openings formed square, neat and within allowable tolerance',
      references: [nhbc91],
      tolerance: {
        ruleId: 'boxing-square-and-line',
        label: 'Boxing, duct casing and corner tolerance',
        prompt: 'Is the measured boxing or duct casing within the allowable tolerance?',
        unit: 'mm',
        measurementRequired: true,
        values: {
          'Deviation in 250mm': 'Maximum 5mm',
          'Deviation in 500mm': 'Maximum 10mm',
          'Deviation from square in 500mm': 'Maximum 10mm',
        },
      },
    },
  ],
  'first-fix-carpentry': [
    {
      id: 'carpentry-boxing-tolerance-001',
      trade: 'Joinery',
      check: 'Bath panels, boxing, service zones or access points formed square, neat and within allowable tolerance',
      references: [nhbc91],
      tolerance: {
        ruleId: 'boxing-square-and-line',
        label: 'Boxing, duct casing and corner tolerance',
        prompt: 'Is the measured boxing or duct casing within the allowable tolerance?',
        unit: 'mm',
        measurementRequired: true,
        values: {
          'Deviation in 250mm': 'Maximum 5mm',
          'Deviation in 500mm': 'Maximum 10mm',
          'Deviation from square in 500mm': 'Maximum 10mm',
        },
      },
    },
  ],
};

export function applyChecklistEnhancements(template: KeyStageInspectionTemplate): KeyStageInspectionTemplate {
  const enhancements = checklistTemplateEnhancements[template.id] ?? [];
  if (enhancements.length === 0) return template;

  const existingIds = new Set(template.items.map((item) => item.id));
  const newItems = enhancements.filter((item) => !existingIds.has(item.id));

  return {
    ...template,
    items: [...template.items, ...newItems],
  };
}
