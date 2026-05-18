import { PlotProgramme, PlotStage } from '../types/models';

export function getStagesForPlot(plotId: string, stages: PlotStage[]) {
  return stages
    .filter((stage) => stage.plotProgrammeId === plotId)
    .sort((a, b) => a.order - b.order);
}

export function getPlotProgress(plotId: string, stages: PlotStage[]) {
  const plotStages = getStagesForPlot(plotId, stages);
  if (plotStages.length === 0) return 0;
  const complete = plotStages.filter((stage) => stage.status === 'Complete').length;
  return Math.round((complete / plotStages.length) * 100);
}

export function getActiveStage(plotId: string, stages: PlotStage[]) {
  const plotStages = getStagesForPlot(plotId, stages);
  return plotStages.find((stage) => stage.status === 'In progress') ?? plotStages[0];
}

export function getKeyStages(stages: PlotStage[]) {
  return stages
    .filter((stage) => stage.isKeyStage)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function getHeldPlots(plots: PlotProgramme[]) {
  return plots.filter((plot) => plot.holdStatus === 'On hold');
}

export function getDelayedStages(stages: PlotStage[]) {
  return stages.filter((stage) => stage.delayDays > 0);
}

export function getTradePerformance(stages: PlotStage[]) {
  const trades = new Map<string, { trade: string; total: number; complete: number; delayed: number }>();

  stages.forEach((stage) => {
    const current = trades.get(stage.trade) ?? {
      trade: stage.trade,
      total: 0,
      complete: 0,
      delayed: 0,
    };

    current.total += 1;
    if (stage.status === 'Complete') current.complete += 1;
    if (stage.delayDays > 0) current.delayed += 1;
    trades.set(stage.trade, current);
  });

  return Array.from(trades.values())
    .map((trade) => ({
      ...trade,
      score: trade.total === 0 ? 0 : Math.round((trade.complete / trade.total) * 100) - trade.delayed * 5,
    }))
    .sort((a, b) => b.score - a.score);
}
