import { RegulationRoute } from '../types/regulations';

export const regulationRoutes: RegulationRoute[] = [
  {
    jurisdiction: 'England',
    label: 'English Building Regulations route',
    sourceUrl: 'https://www.gov.uk/government/collections/approved-documents',
    notes: 'Use this route for plots/sites in England. Approved Documents provide statutory guidance on ways to meet the Building Regulations in England.',
    approvedDocuments: [
      { id: 'eng-ad-a', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document A', title: 'Structure', url: 'https://www.gov.uk/government/publications/structure-approved-document-a' },
      { id: 'eng-ad-b', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document B', title: 'Fire safety', url: 'https://www.gov.uk/government/publications/fire-safety-approved-document-b' },
      { id: 'eng-ad-c', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document C', title: 'Site preparation and resistance to contaminants and moisture', url: 'https://www.gov.uk/government/publications/site-preparation-and-resistance-to-contaminants-and-moisture-approved-document-c' },
      { id: 'eng-ad-f', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document F', title: 'Ventilation', url: 'https://www.gov.uk/government/publications/ventilation-approved-document-f' },
      { id: 'eng-ad-g', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document G', title: 'Sanitation, hot water safety and water efficiency', url: 'https://www.gov.uk/government/publications/sanitation-hot-water-safety-and-water-efficiency-approved-document-g' },
      { id: 'eng-ad-h', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document H', title: 'Drainage and waste disposal', url: 'https://www.gov.uk/government/publications/drainage-and-waste-disposal-approved-document-h' },
      { id: 'eng-ad-k', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document K', title: 'Protection from falling, collision and impact', url: 'https://www.gov.uk/government/publications/protection-from-falling-collision-and-impact-approved-document-k' },
      { id: 'eng-ad-l', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document L', title: 'Conservation of fuel and power', url: 'https://www.gov.uk/government/publications/conservation-of-fuel-and-power-approved-document-l' },
      { id: 'eng-ad-m', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document M', title: 'Access to and use of buildings', url: 'https://www.gov.uk/government/publications/access-to-and-use-of-buildings-approved-document-m' },
      { id: 'eng-ad-o', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document O', title: 'Overheating', url: 'https://www.gov.uk/government/publications/overheating-approved-document-o' },
      { id: 'eng-ad-p', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document P', title: 'Electrical safety', url: 'https://www.gov.uk/government/publications/electrical-safety-approved-document-p' },
      { id: 'eng-ad-q', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document Q', title: 'Security in dwellings', url: 'https://www.gov.uk/government/publications/security-in-dwellings-approved-document-q' },
      { id: 'eng-ad-7', jurisdiction: 'England', source: 'Building Regulations', partOrChapter: 'Approved Document 7', title: 'Material and workmanship', url: 'https://www.gov.uk/government/publications/materials-and-workmanship-approved-document-7' },
    ],
  },
  {
    jurisdiction: 'Wales',
    label: 'Welsh Building Regulations route',
    sourceUrl: 'https://www.gov.wales/building-regulations-approved-documents',
    notes: 'Use this route for plots/sites in Wales. Welsh Approved Documents are separate from the English route and must be selected for Welsh sites.',
    approvedDocuments: [
      { id: 'wal-ad-a', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document A', title: 'Structure', url: 'https://www.gov.wales/approved-document-a-structure' },
      { id: 'wal-ad-b', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document B', title: 'Fire safety', url: 'https://www.gov.wales/approved-document-b-fire-safety' },
      { id: 'wal-ad-c', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document C', title: 'Site preparation and resistance to contaminants and moisture', url: 'https://www.gov.wales/approved-document-c-site-preparation-and-resistance-contaminants-and-moisture' },
      { id: 'wal-ad-f', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document F', title: 'Ventilation', url: 'https://www.gov.wales/approved-document-f-ventilation' },
      { id: 'wal-ad-g', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document G', title: 'Sanitation, hot water safety and water efficiency', url: 'https://www.gov.wales/approved-document-g-sanitation-hot-water-safety-and-water-efficiency' },
      { id: 'wal-ad-h', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document H', title: 'Drainage and waste disposal', url: 'https://www.gov.wales/approved-document-h-drainage-and-waste-disposal' },
      { id: 'wal-ad-k', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document K', title: 'Protection from falling, collision and impact', url: 'https://www.gov.wales/approved-document-k-protection-falling-collision-and-impact' },
      { id: 'wal-ad-l', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document L', title: 'Conservation of fuel and power', url: 'https://www.gov.wales/approved-document-l-conservation-fuel-and-power' },
      { id: 'wal-ad-m', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document M', title: 'Access to and use of buildings', url: 'https://www.gov.wales/approved-document-m-access-and-use-buildings' },
      { id: 'wal-ad-n', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document N', title: 'Glazing safety in relation to impact, opening and cleaning', url: 'https://www.gov.wales/approved-document-n-glazing-safety-relation-impact-opening-and-cleaning' },
      { id: 'wal-ad-o', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document O', title: 'Overheating', url: 'https://www.gov.wales/approved-document-o-overheating' },
      { id: 'wal-ad-p', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document P', title: 'Electrical safety dwellings', url: 'https://www.gov.wales/approved-document-p-electrical-safety-dwellings' },
      { id: 'wal-ad-7', jurisdiction: 'Wales', source: 'Building Regulations', partOrChapter: 'Approved Document 7', title: 'Materials and workmanship', url: 'https://www.gov.wales/approved-document-7-materials-and-workmanship' },
    ],
  },
];

export function getRegulationRoute(jurisdiction: 'England' | 'Wales') {
  return regulationRoutes.find((route) => route.jurisdiction === jurisdiction);
}
