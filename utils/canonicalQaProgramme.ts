import { PlotProgramme } from '../types/models';
import { formatProgrammeDate } from './programmeDates';
import { getHouseTypeTemplates, getPlotCompletionProgrammeWeek, getTemplateForPlot, SiteProgrammeSetup, TemplateSitePlot, PlotTemplate } from './templateProgramme';

export type CanonicalQaPlot = {
  id: string;
  plotNo: string;
  plotName: string;
  houseType: string;
  plotStartDate: string;
  plotCompletionDate: string;
  aliases: string[];
};

export function normaliseCanonicalPlotName(value: string) {
  return String(value ?? '').toLowerCase().replace(/^plot\s*/i, '').replace(/[^a-z0-9.]+/g, '').trim();
}

export function buildCanonicalQaPlots(
  sitePlots: TemplateSitePlot[],
  templates: PlotTemplate[],
  siteSetup: SiteProgrammeSetup,
  legacyPlots: PlotProgramme[] = [],
): CanonicalQaPlot[] {
  const houseTypes = getHouseTypeTemplates(templates);
  return sitePlots.map((plot) => {
    const normalized = normaliseCanonicalPlotName(plot.plotNo);
    const aliases = legacyPlots
      .filter((legacy) => normaliseCanonicalPlotName(legacy.plotName) === normalized)
      .map((legacy) => legacy.id);
    const template = getTemplateForPlot(plot, templates);
    const houseType = houseTypes.find((item) => item.id === (plot.houseTypeId ?? plot.templateId));
    return {
      id: plot.id,
      plotNo: plot.plotNo,
      plotName: `Plot ${plot.plotNo}`,
      houseType: houseType?.name ?? template?.name ?? 'House type',
      plotStartDate: plot.plotStartDate ?? '',
      plotCompletionDate: plot.plotCompletionDate
        || formatProgrammeDate(siteSetup.programmeStartDate, getPlotCompletionProgrammeWeek(plot, siteSetup)),
      aliases: [plot.id, ...aliases],
    };
  });
}

export function findCanonicalQaPlot(plots: CanonicalQaPlot[], evidencePlotId: string) {
  return plots.find((plot) => plot.aliases.includes(evidencePlotId));
}

export function canonicalEvidenceBelongsToPlot(plot: CanonicalQaPlot, evidencePlotId: string) {
  return plot.aliases.includes(evidencePlotId);
}
