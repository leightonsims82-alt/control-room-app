import { timberFrameInspectionTemplates, steelFrameInspectionTemplates } from '../data/buildTypeInspectionTemplates';
import { getFoundationTypeInspectionTemplate } from '../data/foundationTypeInspectionTemplates';
import { stageInspectionTemplates } from '../data/keyStageInspectionTemplates';
import { applyChecklistEnhancements } from '../data/checklistTemplateEnhancements';
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

function isFoundationStage(stageName: string) {
  const normalisedStageName = stageName.toLowerCase();
  return normalisedStageName.includes('foundation') || normalisedStageName.includes('substructure');
}

function withEnhancements(template: KeyStageInspectionTemplate | undefined) {
  return template ? applyChecklistEnhancements(template) : undefined;
}

export function getInspectionTemplateForStage(stageName: string, buildType?: BuildType, foundationType?: string) {
  const normalisedStageName = stageName.toLowerCase();

  if (isFoundationStage(stageName)) {
    const foundationTemplate = getFoundationTypeInspectionTemplate(foundationType);
    if (foundationTemplate) return withEnhancements(foundationTemplate);
  }

  const buildTypeMatch = findDirectTemplate(getBuildTypeTemplates(buildType), stageName);

  if (buildTypeMatch) return withEnhancements(buildTypeMatch);

  const directMatch = findDirectTemplate(stageInspectionTemplates, stageName);

  if (directMatch) return withEnhancements(directMatch);

  if (buildType === 'Timber Frame' && (normalisedStageName.includes('brickwork') || normalisedStageName.includes('gables'))) {
    return withEnhancements(timberFrameInspectionTemplates.find((template) => template.id === 'timber-frame-erection'));
  }

  if (buildType === 'Steel Frame' && normalisedStageName.includes('frame')) {
    return withEnhancements(steelFrameInspectionTemplates.find((template) => template.id === 'steel-frame-erection'));
  }

  if (normalisedStageName.includes('brickwork') || normalisedStageName.includes('gables')) {
    return withEnhancements(stageInspectionTemplates.find((template) => template.id === 'brickwork'));
  }

  if (normalisedStageName.includes('scaffold')) {
    return withEnhancements(stageInspectionTemplates.find((template) => template.id === 'scaffold'));
  }

  if (normalisedStageName.includes('carpentry') && normalisedStageName.includes('first')) {
    return withEnhancements(stageInspectionTemplates.find((template) => template.id === 'first-fix-carpentry'));
  }

  if (normalisedStageName.includes('plumbing') && normalisedStageName.includes('first')) {
    return withEnhancements(stageInspectionTemplates.find((template) => template.id === 'first-fix-plumbing'));
  }

  if ((normalisedStageName.includes('electrics') || normalisedStageName.includes('electrical')) && normalisedStageName.includes('first')) {
    return withEnhancements(stageInspectionTemplates.find((template) => template.id === 'first-fix-electrics'));
  }

  return undefined;
}
