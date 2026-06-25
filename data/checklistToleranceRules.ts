import { MeasurementTolerance } from '../types/regulations';

const nhbc2026 = (id: string, chapter: string, title: string, note?: string) => ({
  id,
  jurisdiction: 'Both' as const,
  source: 'NHBC Standards 2026' as const,
  partOrChapter: chapter,
  title,
  note,
});

export const checklistToleranceRules: MeasurementTolerance[] = [
  {
    id: 'tf-differential-movement-masonry-cladding',
    label: 'Differential movement gap with masonry cladding',
    unit: 'mm',
    rule: 'Check the designed opening or closing gap provided to accommodate differential movement between timber frame and masonry cladding. Use project-specific calculations where provided. If no project-specific calculation is provided, use the NHBC table values.',
    measurementRequired: true,
    prompt: 'Is the measured differential movement gap within the required allowance for the storey level and joist type?',
    values: {
      'Ground floor or lowest level': '5mm solid timber joists / 5mm engineered I-joists',
      'First floor': '20mm solid timber joists / 15mm engineered I-joists',
      'Second floor': '35mm solid timber joists / 25mm engineered I-joists',
      'Third floor': '45mm solid timber joists / 35mm engineered I-joists',
      'Fourth floor': '45mm solid timber joists / value to be checked against project design where above table assumptions do not apply',
      'Fifth floor': 'Specialist/project calculations may be required',
      'Sixth floor and above': 'Specialist calculations to be submitted to NHBC',
      'Eaves/verge': 'Add 5mm to the gap dimension at the level below',
    },
    references: [
      nhbc2026('nhbc-6-2-8', 'Chapter 6.2', 'External timber framed walls, differential movement'),
    ],
  },
  {
    id: 'boxing-square-and-line',
    label: 'Boxing, duct casing and corner tolerance',
    unit: 'mm',
    rule: 'Check boxings, duct casings, access covers and associated framing are square, neat, tidy and within visible finish tolerances. Boxing deviation should not exceed the stated NHBC finish tolerance.',
    measurementRequired: true,
    prompt: 'Is the measured boxing or duct casing within the allowable tolerance?',
    values: {
      'Deviation in 250mm': 'Maximum 5mm',
      'Deviation in 500mm': 'Maximum 10mm',
      'Deviation from square in 500mm': 'Maximum 10mm',
    },
    references: [
      nhbc2026('nhbc-9-1-3-3', 'Chapter 9.1', 'A consistent approach to finishes, tolerances for boxings'),
    ],
  },
  {
    id: 'concrete-cover-not-engineered',
    label: 'Concrete cover to reinforcement',
    unit: 'mm',
    rule: 'Check minimum cover to reinforcement where concrete has not been designed by an engineer. Where engineer design exists, check against the engineer design first.',
    measurementRequired: true,
    prompt: 'Is the measured concrete cover equal to or greater than the required minimum cover for the concrete position?',
    values: {
      'In contact with the ground': '75mm minimum cover',
      'External conditions': '50mm minimum cover',
      'Cast against DPM on sand blinding': '40mm minimum cover',
      'Against adequate blinding concrete': '40mm minimum cover',
      'Protected or internal conditions': '25mm minimum cover',
    },
    references: [
      nhbc2026('nhbc-3-1-9-3', 'Chapter 3.1', 'Concrete and its reinforcement, concrete cover'),
    ],
  },
  {
    id: 'cold-weather-masonry-temperature',
    label: 'Cold weather masonry temperature limit',
    unit: 'text',
    rule: 'Brickwork and blockwork should not be built when air temperature is below 3°C and falling. Work can resume when temperature is 1°C and rising with the expectation it will exceed 3°C.',
    measurementRequired: true,
    prompt: 'Are the temperature conditions acceptable for masonry work to proceed?',
    values: {
      'Do not proceed': 'Below 3°C and falling',
      'Can resume': '1°C and rising, with expectation temperature will exceed 3°C',
    },
    references: [
      nhbc2026('nhbc-3-2-5', 'Chapter 3.2', 'Cold weather working, masonry'),
    ],
  },
];

export function getToleranceRule(ruleId: string) {
  return checklistToleranceRules.find((rule) => rule.id === ruleId);
}
