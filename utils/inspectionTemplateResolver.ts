import { timberFrameInspectionTemplates, steelFrameInspectionTemplates } from '../data/buildTypeInspectionTemplates';
import { stageInspectionTemplates } from '../data/keyStageInspectionTemplates';
import { BuildType, KeyStageInspectionTemplate } from '../types/models';

function findDirectTemplate(templates: KeyStageInspectionTemplate[], stageName: string) {
  const normalisedStageName = stageName.toLowerCase();
  return templates.find((template) =>
    template.matchedStageNames.some((matchedName) => normalisedStageName.includes(matchedName.toLowerCase())),
  );
}

function getBuildTypeTemplates(buildType?: BuildType) {
  if (buildType === 'Timber Frame') return timberFrameInspectionTemplates;
  if (buildType === 'Steel Frame') return steelFrameInspectionTemplates;
  return [];
}

export function getInspectionTemplateForStage(stageName: string, buildType?: BuildType) {
  const normalisedStageName = stageName.toLowerCase();
  const buildTypeMatch = findDirectTemplate(getBuildTypeTemplates(buildType), stageName);

  if (buildTypeMatch) return buildTypeMatch;

  const directMatch = findDirectTemplate(stageInspectionTemplates, stageName);

  if (directMatch) return directMatch;

  if (buildType === 'Timber Frame' && (normalisedStageName.includes('brickwork') || normalisedStageName.includes('gables'))) {
    return timberFrameInspectionTemplates.find((template) => template.id === 'timber-frame-erection');
  }

  if (buildType === 'Steel Frame' && normalisedStageName.includes('frame')) {
    return steelFrameInspectionTemplates.find((template) => template.id === 'steel-frame-erection');
  }

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
