import { stageInspectionTemplates } from '../data/keyStageInspectionTemplates';

export function getInspectionTemplateForStage(stageName: string) {
  const normalisedStageName = stageName.toLowerCase();

  const directMatch = stageInspectionTemplates.find((template) =>
    template.matchedStageNames.some((matchedName) => normalisedStageName.includes(matchedName.toLowerCase())),
  );

  if (directMatch) return directMatch;

  if (normalisedStageName.includes('brickwork') || normalisedStageName.includes('gables')) {
    return stageInspectionTemplates.find((template) => template.id === 'brickwork');
  }

  if (normalisedStageName.includes('scaffold')) {
    return stageInspectionTemplates.find((template) => template.id === 'scaffold');
  }

  if (normalisedStageName.includes('carpentry') && normalisedStageName.includes('first')) {
    return stageInspectionTemplates.find((template) => template.id === 'first-fix-carpentry');
  }

  if (normalisedStageName.includes('plumbing') && normalisedStageName.includes('first')) {
    return stageInspectionTemplates.find((template) => template.id === 'first-fix-plumbing');
  }

  if ((normalisedStageName.includes('electrics') || normalisedStageName.includes('electrical')) && normalisedStageName.includes('first')) {
    return stageInspectionTemplates.find((template) => template.id === 'first-fix-electrics');
  }

  return undefined;
}
