type KeywordMapping = {
  keywords: string[];
  trade: string;
};

const timberFrameKeywords = ['timber frame', 'frame erection', 'frame install', 'timber structure', 'frame panels'];

const keywordMappings: KeywordMapping[] = [
  { keywords: timberFrameKeywords, trade: 'Timber Frame Contractor' },
  { keywords: ['substructure', 'drainage', 'drains', 'oversite', 'slab', 'foundation', 'groundwork'], trade: 'Groundworks' },
  { keywords: ['brickwork', 'lift brickwork', 'superstructure'], trade: 'Brickwork' },
  { keywords: ['scaffold'], trade: 'Scaffold' },
  { keywords: ['sprinkler'], trade: 'Sprinkler Contractor' },
  { keywords: ['roof structure', 'cut roof', 'trusses', 'joist', 'flooring', 'windows', 'doors', 'first fix carpentry', 'second fix carpentry', '1st fix carpentry', '2nd fix carpentry', 'carpentry', 'joinery'], trade: 'Carpenter' },
  { keywords: ['roof covering', 'gables', 'slating', 'felt and batten', 'leadwork', 'roofing'], trade: 'Roofing' },
  { keywords: ['first fix plumbing', 'second fix plumbing', '1st fix plumbing', '2nd fix plumbing', 'plumbing finals', 'plumbing'], trade: 'Plumber' },
  { keywords: ['first fix electrical', 'first fix electrics', 'second fix electrical', 'second fix electrics', '1st fix electrical', '1st fix electrics', '2nd fix electrical', '2nd fix electrics', 'electrical finals', 'electrics', 'electrical'], trade: 'Electrician' },
  { keywords: ['insulation', 'loft insulation', 'drylining', 'dry lining'], trade: 'Dryliner' },
  { keywords: ['plastering', 'plaster', 'render'], trade: 'Plasterer' },
  { keywords: ['second fix complete', '2nd fix complete', 'finals', 'pre handover', 'patching', 'sanding', 'decoration', 'decorating', 'mist coat', 'paint', 'decorator', 'snag', 'handover clean'], trade: 'Decorator' },
  { keywords: ['wall tiling', 'splashback', 'tiling'], trade: 'Wall Tiler' },
  { keywords: ['solar'], trade: 'Solar Panels' },
];

export function getTradeByStageNameKeywords(stageName?: string) {
  if (!stageName) return '';

  const lower = stageName.toLowerCase();

  if (timberFrameKeywords.some((keyword) => lower.includes(keyword))) {
    return 'Timber Frame Contractor';
  }

  const match = keywordMappings.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)));
  return match?.trade ?? '';
}

export function resolveStageTrade(stageName: string, manualTrade?: string) {
  return manualTrade || getTradeByStageNameKeywords(stageName) || 'Unassigned';
}
