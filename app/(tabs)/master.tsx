import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MasterPaperSize, printMasterProgramme } from '../../utils/masterProgrammePrint';
import { AppScreen } from '../../components/AppScreen';
import { ProgrammeDatePicker } from '../../components/ProgrammeDatePicker';
import { openMasterPlotManager } from '../../components/MasterPlotManager';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import {
  clearPlotMetadata,
  getPlotMetadataKey,
  PlotBuildRoute,
  PlotMetadataMap,
  readPlotMetadata,
  removePlotMetadata,
  savePlotMetadata,
} from '../../utils/plotMetadata';
import { formatCalendarWeek, formatProgrammeDate, getCurrentProgrammeWeek, getProgrammeWeekForDate, shiftProgrammeWorkingDays, validatePlotCompletionDate } from '../../utils/programmeDates';
import {
  ConfiguredProgrammeStage,
  getConfiguredStageProgrammeStartWeek,
  readStageConfiguration,
} from '../../utils/stageConfiguration';
import { PROGRAMME_STAGE_SEQUENCE, ProgrammeStageNumber } from '../../utils/siteProgrammeEngine';
import {
  canAdjustFinalStageWeek,
  getPlotLiveFinishProgrammeWeek,
  getPlotLiveFinishDate,
  getEffectiveProgrammeWeeks,
  getHouseTypeLabel,
  getHouseTypeTemplates,
  getMasterProgrammeWeeks,
  getLiveStageNumbersForPlotWeek,
  getPlotBuildOrder,
  getPlotCompletionProgrammeWeek,
  getPlotHoldDetail,
  getPlotHoldLabel,
  getSortedSitePlots,
  getTemplateById,
  getTemplateForPlot,
  getTemplateProgrammeWorkingDays,
} from '../../utils/templateProgramme';

type ResetMode = 'all' | 'single';
type ProgrammeGenerationBasis = 'start' | 'completion';

export default function MasterProgrammeScreen() {
  const { sitePlots, activityDelays, activityMoves, plotTemplates, siteSetup, upsertSitePlot, removeSitePlot, clearSitePlotData, holdPlotAtStage, adjustFinalStageWeek } = useSitePlanner();
  const sortedPlots = useMemo(() => getSortedSitePlots(sitePlots), [sitePlots]);
  const houseTypes = useMemo(() => getHouseTypeTemplates(plotTemplates), [plotTemplates]);
  const currentProgrammeWeek = getCurrentProgrammeWeek(siteSetup.programmeStartDate);
  const visibleWeeks = useMemo(
    () => getMasterProgrammeWeeks(sitePlots, currentProgrammeWeek, activityDelays, activityMoves, plotTemplates, siteSetup),
    [sitePlots, currentProgrammeWeek, activityDelays, activityMoves, plotTemplates, siteSetup],
  );
  const initialStageCount = 9;
  const [plotNo, setPlotNo] = useState('');
  const [paperSize, setPaperSize] = useState<MasterPaperSize>('A3');
  const [printError, setPrintError] = useState('');
  const [stageSaving, setStageSaving] = useState('');
  const [stageMessage, setStageMessage] = useState('');
  const matrixWeeks = [...visibleWeeks, (visibleWeeks.at(-1) ?? currentProgrammeWeek) + 1];
  const changeFinalStage = async (plotId: string, plotNumber: string, delta: -1 | 1) => {
    if (stageSaving) return;
    setStageSaving(plotId);
    setStageMessage('');
    try {
      await adjustFinalStageWeek(plotId, delta);
      setStageMessage(`Plot ${plotNumber}: final stage ${delta > 0 ? 'extended' : 'shortened'} by one working week.`);
    } catch (error) {
      setStageMessage(error instanceof Error ? error.message : 'Unable to save the stage change. Please try again.');
    } finally { setStageSaving(''); }
  };

  const [programmeGenerationBasis, setProgrammeGenerationBasis] = useState<ProgrammeGenerationBasis>('completion');
  const [plotStartDate, setPlotStartDate] = useState('');
  const [plotCompletionDate, setPlotCompletionDate] = useState('');
  const [plotDateError, setPlotDateError] = useState('');
  const [buildRoute, setBuildRoute] = useState<PlotBuildRoute>('Traditional');
  const [houseTypeId, setHouseTypeId] = useState('');
  const [plotMetadata, setPlotMetadata] = useState<PlotMetadataMap>({});
  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(
    PROGRAMME_STAGE_SEQUENCE.slice(0, initialStageCount).map((stage) => ({ ...stage })),
  );
  const [resetMode, setResetMode] = useState<ResetMode>('single');
  const [selectedResetPlotId, setSelectedResetPlotId] = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [holdPlotId, setHoldPlotId] = useState('');
  const [holdStage, setHoldStage] = useState<ProgrammeStageNumber | undefined>();
  const [holdReason, setHoldReason] = useState('');
  const selectedResetPlot = sortedPlots.find((plot) => plot.id === selectedResetPlotId) ?? sortedPlots[0];
  const selectedHoldPlot = sortedPlots.find((plot) => plot.id === holdPlotId) ?? sortedPlots[0];
  const nextPlotHint = String(sitePlots.length + 1);
  const selectedHouseType = houseTypes.find((template) => template.id === houseTypeId) ?? houseTypes[0];
  const selectedProgrammeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : selectedHouseType?.id ?? 'threeBed';
  const selectedProgrammeTemplate = getTemplateById(selectedProgrammeTemplateId, plotTemplates);
  const selectedProgrammeWeeks = selectedProgrammeTemplate
    ? getEffectiveProgrammeWeeks(selectedProgrammeTemplate, siteSetup)
    : Math.max(1, siteSetup.defaultProgrammeWeeks || 23);
  const nextCompletionWeek = (sitePlots.length ? Math.max(...sitePlots.map((plot) => getPlotCompletionProgrammeWeek(plot, siteSetup))) : 22) + 1;
  const nextCompletionHint = formatProgrammeDate(siteSetup.programmeStartDate, nextCompletionWeek);
  const nextStartHint = selectedProgrammeTemplate
    ? shiftProgrammeWorkingDays(nextCompletionHint, -(getTemplateProgrammeWorkingDays(selectedProgrammeTemplate) - 1), siteSetup.includeSaturday, siteSetup.includeSunday)
    : formatProgrammeDate(siteSetup.programmeStartDate, Math.max(1, nextCompletionWeek - selectedProgrammeWeeks + 1));

  useEffect(() => {
    readPlotMetadata().then(setPlotMetadata).catch(() => setPlotMetadata({}));
  }, []);

  useEffect(() => {
    if (!houseTypeId && houseTypes[0]?.id) setHouseTypeId(houseTypes[0].id);
    if (houseTypeId && !houseTypes.some((template) => template.id === houseTypeId)) {
      setHouseTypeId(houseTypes[0]?.id ?? '');
    }
  }, [houseTypeId, houseTypes]);


  useEffect(() => {
    readStageConfiguration(9)
      .then((stages) => setStageDefinitions(stages.slice(0, 9)))
      .catch(() => {
        setStageDefinitions(PROGRAMME_STAGE_SEQUENCE.slice(0, 9).map((stage) => ({ ...stage })));
      });
  }, [siteSetup]);

  useEffect(() => {
    if (!selectedResetPlotId && sortedPlots[0]?.id) setSelectedResetPlotId(sortedPlots[0].id);
    if (!holdPlotId && sortedPlots[0]?.id) {
      setHoldPlotId(sortedPlots[0].id);
      setHoldStage(sortedPlots[0].holdStage);
      setHoldReason(sortedPlots[0].holdReason ?? '');
    }
  }, [holdPlotId, selectedResetPlotId, sortedPlots]);

  const getStageDisplayForWeek = (plot: (typeof sitePlots)[number], week: number) => {
    return getLiveStageNumbersForPlotWeek(plot, week, activityDelays, activityMoves, plotTemplates, siteSetup);
  };

  const printAllLivePages = () => {
    const error = printMasterProgramme({
      paperSize,
      siteName: siteSetup.siteName,
      weeks: visibleWeeks.map((week) => ({
        label: formatCalendarWeek(siteSetup.programmeStartDate, week, siteSetup.calendarWeekOne),
        date: formatProgrammeDate(siteSetup.programmeStartDate, week, siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5),
      })),
      rows: sortedPlots.map((plot, rowIndex) => {
        const metadata = plotMetadata[getPlotMetadataKey(plot.plotNo)];
        const houseTypeId = plot.houseTypeId ?? metadata?.houseTypeId ?? metadata?.bedroomTemplateId ?? plot.templateId;
        const houseType = houseTypes.find((template) => template.id === houseTypeId);
        return {
          sequence: getPlotBuildOrder(plot, rowIndex),
          plot: plot.plotNo,
          route: metadata?.buildRoute ?? (plot.constructionMethod === 'timberFrame' ? 'Timber Frame' : 'Traditional'),
          houseType: houseType?.name ?? metadata?.houseTypeName ?? getHouseTypeLabel(getTemplateForPlot(plot, plotTemplates)),
          start: formatCalendarWeek(siteSetup.programmeStartDate, getConfiguredStageProgrammeStartWeek(stageDefinitions, getPlotCompletionProgrammeWeek(plot, siteSetup)), siteSetup.calendarWeekOne),
          completion: plot.finalStageAdjustmentWeeks ? getPlotLiveFinishDate(plot, activityDelays, activityMoves, plotTemplates, siteSetup) : plot.plotCompletionDate || metadata?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, getPlotCompletionProgrammeWeek(plot, siteSetup)),
          stages: visibleWeeks.map((week) => getStageDisplayForWeek(plot, week)),
        };
      }),
      stageKey: stageDefinitions,
    });
    setPrintError(error ?? '');
  };

  const selectGenerationBasis = (basis: ProgrammeGenerationBasis) => {
    setProgrammeGenerationBasis(basis);
    setPlotDateError('');
  };

  const savePlot = async () => {
    const selectedDate = programmeGenerationBasis === 'start' ? plotStartDate : plotCompletionDate;
    const dateLabel = programmeGenerationBasis === 'start' ? 'Plot Start Date' : 'Plot Completion Date';
    const rawDateError = validatePlotCompletionDate(siteSetup.programmeStartDate, selectedDate);
    const dateError = rawDateError.replace(/Plot Completion Date/g, dateLabel);
    setPlotDateError(dateError);
    const anchorWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, selectedDate);
    const cleanedPlotNo = plotNo.trim();
    if (!cleanedPlotNo || dateError || !anchorWeek) return;

    if (!selectedHouseType) {
      setPlotDateError('Create and select a house type in Site Setup before adding a plot.');
      return;
    }

    const programmeTemplateId = buildRoute === 'Timber Frame' ? 'timberFrame' : selectedHouseType.id;
    const programmeTemplate = getTemplateById(programmeTemplateId, plotTemplates);
    const programmeWorkingDays = programmeTemplate
      ? getTemplateProgrammeWorkingDays(programmeTemplate)
      : Math.max(1, (siteSetup.defaultProgrammeWeeks || 23) * (siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5));
    const exactStartDate = programmeGenerationBasis === 'start'
      ? selectedDate
      : shiftProgrammeWorkingDays(selectedDate, -(programmeWorkingDays - 1), siteSetup.includeSaturday, siteSetup.includeSunday);
    const exactCompletionDate = programmeGenerationBasis === 'completion'
      ? selectedDate
      : shiftProgrammeWorkingDays(selectedDate, programmeWorkingDays - 1, siteSetup.includeSaturday, siteSetup.includeSunday);
    const completionWeek = getProgrammeWeekForDate(siteSetup.programmeStartDate, exactCompletionDate);
    if (!completionWeek) {
      setPlotDateError('Unable to calculate the programme completion week for that date.');
      return;
    }

    const existingPlot = sitePlots.find((plot) => plot.plotNo.toLowerCase() === cleanedPlotNo.toLowerCase());
    const nextBuildOrder = sitePlots.length ? Math.max(...sitePlots.map((plot) => plot.buildOrder ?? 0)) + 1 : 1;
    await upsertSitePlot({
      plotNo: cleanedPlotNo,
      buildOrder: existingPlot?.buildOrder ?? nextBuildOrder,
      stage9CompleteWeek: completionWeek,
      plotStartDate: exactStartDate,
      plotCompletionDate: exactCompletionDate,
      templateId: selectedHouseType.id,
      houseTypeId: selectedHouseType.id,
      constructionMethod: buildRoute === 'Timber Frame' ? 'timberFrame' : 'traditional',
    });
    const nextMetadata = await savePlotMetadata({
      plotNo: cleanedPlotNo,
      houseTypeName: selectedHouseType.name,
      houseTypeId: selectedHouseType.id,
      buildRoute,
      programmeGenerationBasis,
      plotStartDate: exactStartDate,
      plotCompletionDate: exactCompletionDate,
    });
    setPlotMetadata(nextMetadata);
    setPlotNo('');
    setPlotStartDate('');
    setPlotCompletionDate('');
    setPlotDateError('');
    setClearConfirm(false);
  };

  const selectResetMode = (mode: ResetMode) => {
    setResetMode(mode);
    setClearConfirm(false);
  };

  const selectResetPlot = (plotId: string) => {
    setSelectedResetPlotId(plotId);
    setClearConfirm(false);
  };

  const clearRequestedPlotData = async () => {
    if (!sitePlots.length) return;
    if (!clearConfirm) {
      setClearConfirm(true);
      return;
    }
    if (resetMode === 'all') {
      await Promise.all([clearSitePlotData(), clearPlotMetadata()]);
      setPlotMetadata({});
    } else if (selectedResetPlot) {
      await removeSitePlot(selectedResetPlot.id);
      setPlotMetadata(await removePlotMetadata(selectedResetPlot.plotNo));
    }
    setClearConfirm(false);
  };

  const selectHoldPlot = (plotId: string) => {
    const plot = sortedPlots.find((item) => item.id === plotId);
    setHoldPlotId(plotId);
    setHoldStage(plot?.holdStage);
    setHoldReason(plot?.holdReason ?? '');
  };

  const applyStageHold = async () => {
    if (!selectedHoldPlot || !holdStage) return;
    await holdPlotAtStage({ plotId: selectedHoldPlot.id, holdStage, holdReason });
  };

  const releaseStageHold = async () => {
    if (!selectedHoldPlot) return;
    await holdPlotAtStage({ plotId: selectedHoldPlot.id });
    setHoldStage(undefined);
    setHoldReason('');
  };

  const clearButtonLabel = (() => {
    if (!sitePlots.length) return 'No Plot Data To Clear';
    if (resetMode === 'all') return clearConfirm ? 'Confirm Clear All Plot Data' : `Clear All ${sitePlots.length} Plots`;
    return clearConfirm ? `Confirm Clear Plot ${selectedResetPlot?.plotNo ?? ''}` : `Clear Plot ${selectedResetPlot?.plotNo ?? ''}`;
  })();

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Master 23 Week Programme</Text>
        <Text style={styles.subtitle}>The programme starts at the current week and shows the following 22 weeks.</Text>
      </View>

      <SectionCard title="Plot input" subtitle="Choose whether the programme is driven from the plot start date or the completion date, then add the plot in sequence.">
        <View style={styles.generationPanel}>
          <View style={styles.inputWrapRoute}>
            <Text style={styles.label}>Generate Programme From</Text>
            <View style={styles.routeChips}>
              {(['start', 'completion'] as ProgrammeGenerationBasis[]).map((basis) => {
                const active = basis === programmeGenerationBasis;
                const label = basis === 'start' ? 'Start Date' : 'Completion Date';
                return (
                  <Pressable key={basis} style={[styles.routeChip, active ? styles.routeChipActive : null]} onPress={() => selectGenerationBasis(basis)}>
                    <Text style={[styles.routeChipText, active ? styles.routeChipTextActive : null]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text style={styles.generationHelp}>
            {programmeGenerationBasis === 'start'
              ? `Forward plan: choose the start date and SiteProg will calculate the completion date using the ${selectedProgrammeWeeks}-week programme.`
              : `Back-plan: choose the completion date and SiteProg will calculate the start date using the ${selectedProgrammeWeeks}-week programme.`}
          </Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>Plot No</Text>
            <TextInput value={plotNo} onChangeText={setPlotNo} style={styles.input} placeholder={`e.g. ${nextPlotHint}`} />
          </View>
          <View style={styles.inputWrapSmall}>
            <Text style={styles.label}>{programmeGenerationBasis === 'start' ? 'Plot Start Date' : 'Plot Completion Date'}</Text>
            <ProgrammeDatePicker
              value={programmeGenerationBasis === 'start' ? plotStartDate : plotCompletionDate}
              onChange={(value) => {
                if (programmeGenerationBasis === 'start') setPlotStartDate(value);
                else setPlotCompletionDate(value);
                setPlotDateError('');
              }}
              placeholder={`Select date, e.g. ${programmeGenerationBasis === 'start' ? nextStartHint : nextCompletionHint}`}
              initialDate={programmeGenerationBasis === 'start' ? nextStartHint : nextCompletionHint}
              minimumDate={siteSetup.programmeStartDate}
              error={Boolean(plotDateError)}
            />
          </View>
          <View style={styles.inputWrapRoute}>
            <Text style={styles.label}>Build Route</Text>
            <View style={styles.routeChips}>
              {(['Traditional', 'Timber Frame'] as PlotBuildRoute[]).map((route) => {
                const active = route === buildRoute;
                return (
                  <Pressable key={route} style={[styles.routeChip, active ? styles.routeChipActive : null]} onPress={() => setBuildRoute(route)}>
                    <Text style={[styles.routeChipText, active ? styles.routeChipTextActive : null]}>{route}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.inputWrapWide}>
            <Text style={styles.label}>House Type</Text>
            {houseTypes.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.templateChips}>
                {houseTypes.map((template) => {
                  const active = template.id === selectedHouseType?.id;
                  return (
                    <Pressable key={template.id} style={[styles.templateChip, active ? styles.templateChipActive : null]} onPress={() => setHouseTypeId(template.id)}>
                      <Text style={[styles.templateChipText, active ? styles.templateChipTextActive : null]}>{getHouseTypeLabel(template)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView> : <Text style={styles.errorText}>No house types created. Create one in Site Setup first.</Text>}
          </View>
          {selectedHouseType ? <View style={styles.houseTypeSummary}>
            <Text style={styles.houseTypeSummaryTitle}>{selectedHouseType.name}</Text>
            <Text style={styles.houseTypeSummaryText}>{selectedHouseType.bedrooms ?? '-'} bedrooms · {selectedHouseType.floors ?? '-'} storeys</Text>
          </View> : null}
          <Pressable disabled={!selectedHouseType} style={[styles.saveButton, !selectedHouseType ? styles.disabledButton : null]} onPress={savePlot}>
            <Text style={styles.saveButtonText}>Generate Plot Programme</Text>
          </Pressable>
        </View>
        {plotDateError ? <Text style={styles.errorText}>{plotDateError}</Text> : null}
      </SectionCard>

      <SectionCard title="Hold plot at stage" subtitle="Use this when a plot has stopped and should not progress into later stages until released.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {sortedPlots.map((plot) => (
              <Pressable key={plot.id} style={[styles.templateChip, plot.id === selectedHoldPlot?.id ? styles.templateChipActive : null]} onPress={() => selectHoldPlot(plot.id)}>
                <Text style={[styles.templateChipText, plot.id === selectedHoldPlot?.id ? styles.templateChipTextActive : null]}>Plot {plot.plotNo}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.holdPanel}>
          <Text style={styles.holdStatus}>{selectedHoldPlot ? getPlotHoldDetail(selectedHoldPlot) : 'No plot selected.'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stageChips}>
              {stageDefinitions.map((stage) => {
                const stageNumber = stage.stage as ProgrammeStageNumber;
                const active = holdStage === stageNumber;
                return (
                  <Pressable key={stage.stage} style={[styles.stageChip, active ? styles.stageChipActive : null]} onPress={() => setHoldStage(stageNumber)}>
                    <Text style={[styles.stageChipNumber, active ? styles.stageChipTextActive : null]}>Stage {stage.stage}</Text>
                    <Text style={[styles.stageChipLabel, active ? styles.stageChipTextActive : null]}>{stage.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <TextInput value={holdReason} onChangeText={setHoldReason} placeholder="Reason for hold e.g. awaiting scaffold, materials, QA recheck" style={styles.input} />
          <View style={styles.buttonRow}>
            <Pressable disabled={!selectedHoldPlot || !holdStage} style={[styles.saveButton, !selectedHoldPlot || !holdStage ? styles.disabledButton : null]} onPress={applyStageHold}>
              <Text style={styles.saveButtonText}>{holdStage ? `Hold At Stage ${holdStage}` : 'Select Stage To Hold'}</Text>
            </Pressable>
            <Pressable disabled={!selectedHoldPlot?.holdStage} style={[styles.releaseButton, !selectedHoldPlot?.holdStage ? styles.disabledButton : null]} onPress={releaseStageHold}>
              <Text style={styles.releaseButtonText}>Release Hold</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Reset plot data" subtitle="Choose whether to clear every plot or only one selected plot. A second confirmation press is required.">
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Warning</Text>
          <Text style={styles.warningText}>Clearing plot data removes programme rows, delays, dragged trade moves, programme notes and QA records for the selected option. House type templates and site setup stay in place.</Text>
        </View>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeButton, resetMode === 'single' ? styles.modeButtonActive : null]} onPress={() => selectResetMode('single')}>
            <Text style={[styles.modeButtonText, resetMode === 'single' ? styles.modeButtonTextActive : null]}>Individual Plot</Text>
          </Pressable>
          <Pressable style={[styles.modeButton, resetMode === 'all' ? styles.modeButtonActiveDanger : null]} onPress={() => selectResetMode('all')}>
            <Text style={[styles.modeButtonText, resetMode === 'all' ? styles.modeButtonTextActive : null]}>Clear All Plots</Text>
          </Pressable>
        </View>
        {resetMode === 'single' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templateChips}>
              {sortedPlots.map((plot) => (
                <Pressable key={plot.id} style={[styles.templateChip, plot.id === selectedResetPlot?.id ? styles.templateChipActive : null]} onPress={() => selectResetPlot(plot.id)}>
                  <Text style={[styles.templateChipText, plot.id === selectedResetPlot?.id ? styles.templateChipTextActive : null]}>Plot {plot.plotNo}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        <Text style={styles.resetText}>{resetMode === 'all' ? `You are about to clear all ${sitePlots.length} saved plots from this device.` : `You are about to clear Plot ${selectedResetPlot?.plotNo ?? '-'} only.`}</Text>
        {clearConfirm ? <Text style={styles.confirmText}>Confirm this action by pressing the button again.</Text> : null}
        <Pressable
          disabled={!sitePlots.length || (resetMode === 'single' && !selectedResetPlot)}
          style={[styles.clearButton, clearConfirm ? styles.clearButtonArmed : null, !sitePlots.length ? styles.clearButtonDisabled : null]}
          onPress={clearRequestedPlotData}
        >
          <Text style={styles.clearButtonText}>{clearButtonLabel}</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Master stage-number matrix" subtitle={`Stages follow the live programme. This programme uses ${stageDefinitions.length} stages.`}>
        <View style={styles.buttonRow}>
          {(['A3', 'A4'] as MasterPaperSize[]).map((size) => (
            <Pressable key={size} accessibilityRole="radio" accessibilityState={{ checked: paperSize === size }}
              accessibilityLabel={`${size} landscape`} onPress={() => setPaperSize(size)}
              style={[styles.routeChip, paperSize === size ? styles.routeChipActive : null]}>
              <Text style={[styles.routeChipText, paperSize === size ? styles.routeChipTextActive : null]}>{size} landscape</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" disabled={!sortedPlots.length} onPress={printAllLivePages}
            style={[styles.saveButton, !sortedPlots.length ? styles.disabledButton : null]}>
            <Text style={styles.saveButtonText}>Print all live pages</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{sortedPlots.length} plots · {Math.ceil(sortedPlots.length / 30) * Math.ceil(visibleWeeks.length / 23)} pages · Maximum 30 plots and 23 weeks per page. All date sections included. Print or save as PDF. Bedrooms, storeys and hold columns are omitted from the printout.</Text>
        <Text style={styles.subtitle}>Use − / + after the last populated cell to shorten or extend the final stage by one working week. Earlier stages stay fixed. Shortening keeps at least one working day per activity.</Text>
        {stageMessage ? <Text accessibilityRole="alert" style={styles.subtitle}>{stageMessage}</Text> : null}
        {printError ? <Text accessibilityRole="alert" style={styles.errorText}>{printError}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={styles.tableRow}>
              <Text style={[styles.headerCell, styles.buildCell]}>Seq</Text>
              <Text style={[styles.headerCell, styles.plotCell]}>Plot</Text>
              <Text style={[styles.headerCell, styles.routeCell]}>Route</Text>
              <Text style={[styles.headerCell, styles.houseTypeCell]}>House Type</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Beds</Text>
              <Text style={[styles.headerCell, styles.templateCell]}>Storeys</Text>
              <Text style={[styles.headerCell, styles.holdCell]}>Hold</Text>
              <Text style={[styles.headerCell, styles.weekInputCell]}>Start</Text>
              <Text style={[styles.headerCell, styles.completionCell]}>Plot Completion</Text>
              {matrixWeeks.map((week) => (
                <View key={week} style={styles.weekHeader}>
                  <Text style={styles.weekHeaderWeek}>{formatCalendarWeek(siteSetup.programmeStartDate, week, siteSetup.calendarWeekOne)}</Text>
                  <Text style={styles.weekHeaderDate}>{formatProgrammeDate(siteSetup.programmeStartDate, week, siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5)}</Text>
                </View>
              ))}
              <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
            </View>

            {sortedPlots.length === 0 ? (
              <View style={styles.emptyMatrixRow}>
                <Text style={styles.emptyMatrixText}>No plots saved. Add a plot using the Plot Input section above.</Text>
              </View>
            ) : null}

            {sortedPlots.map((plot, rowIndex) => {
              const metadata = plotMetadata[getPlotMetadataKey(plot.plotNo)];
              const route = metadata?.buildRoute ?? (plot.constructionMethod === 'timberFrame' ? 'Timber Frame' : 'Traditional');
              const houseTypeTemplateId = plot.houseTypeId ?? metadata?.houseTypeId ?? metadata?.bedroomTemplateId ?? plot.templateId;
              const houseType = houseTypes.find((template) => template.id === houseTypeTemplateId);
              const programmeTemplate = getTemplateForPlot(plot, plotTemplates);
              const controlWeek = Math.max(currentProgrammeWeek, getPlotLiveFinishProgrammeWeek(plot, activityDelays, activityMoves, plotTemplates, siteSetup) + 1);
              return (
                <View key={plot.id} style={[styles.tableRow, rowIndex % 2 ? styles.altRow : null]}>
                  <Text style={[styles.bodyCell, styles.buildCell]}>{getPlotBuildOrder(plot, rowIndex)}</Text>
                  <Text style={[styles.bodyCell, styles.plotCell]}>{plot.plotNo}</Text>
                  <Text style={[styles.bodyCell, styles.routeCell]}>{route}</Text>
                  <Text style={[styles.bodyCell, styles.houseTypeCell]}>{houseType?.name ?? metadata?.houseTypeName ?? getHouseTypeLabel(programmeTemplate)}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{houseType?.bedrooms ?? '-'}</Text>
                  <Text style={[styles.bodyCell, styles.templateCell]}>{houseType?.floors ?? '-'}</Text>
                  <Text style={[styles.holdBodyCell, styles.holdCell, plot.holdStage ? styles.holdBodyCellActive : null]}>{getPlotHoldLabel(plot)}</Text>
                  <Text style={[styles.stageStartBody, styles.weekInputCell]}>{formatCalendarWeek(siteSetup.programmeStartDate, getConfiguredStageProgrammeStartWeek(stageDefinitions, getPlotCompletionProgrammeWeek(plot, siteSetup)), siteSetup.calendarWeekOne)}</Text>
                  <Text style={[styles.weekInputBody, styles.completionCell]}>{plot.plotCompletionDate || metadata?.plotCompletionDate || formatProgrammeDate(siteSetup.programmeStartDate, getPlotCompletionProgrammeWeek(plot, siteSetup))}{plot.finalStageAdjustmentWeeks ? `\nLive: ${getPlotLiveFinishDate(plot, activityDelays, activityMoves, plotTemplates, siteSetup)}` : ''}</Text>
                  {matrixWeeks.map((week) => {
                    if (week === controlWeek) return <View key={week} style={styles.finishControls}>
                      {([-1, 1] as const).map((delta) => {
                        const disabled = Boolean(stageSaving) || !canAdjustFinalStageWeek(plot, delta, plotTemplates, activityDelays, siteSetup);
                        return <Pressable key={delta} accessibilityRole="button" disabled={disabled}
                          accessibilityLabel={`${delta > 0 ? 'Extend' : 'Shorten'} final stage by one week for Plot ${plot.plotNo}`}
                          onPress={() => changeFinalStage(plot.id, plot.plotNo, delta)}
                          style={[styles.finishButton, disabled ? styles.disabledButton : null]}>
                          <Text style={styles.saveButtonText}>{delta > 0 ? '+' : '−'}</Text>
                        </Pressable>;
                      })}
                    </View>;

                    const stage = getStageDisplayForWeek(plot, week);
                    const heldStageCell = String(stage).includes('H');
                    return <Text key={week} style={[styles.weekCell, stage ? styles.activeWeekCell : null, heldStageCell ? styles.heldWeekCell : null]}>{stage}</Text>;
                  })}
                  <View style={[styles.bodyCell, styles.actionCell, styles.actionButtonCell]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Manage Plot ${plot.plotNo}`}
                      onPress={() => openMasterPlotManager(plot.id)}
                      style={styles.manageButton}
                    >
                      <Text style={styles.manageButtonText}>Manage</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Stage key" subtitle={`Showing the ${stageDefinitions.length} stages configured in Site Setup.`}>
        <View style={styles.stageKeyGrid}>
          {stageDefinitions.map((stage) => {
            const durationWeeks = Math.max(1, stage.finishWeek - stage.startWeek + 1);
            return (
              <View key={stage.stage} style={styles.stageKeyItem}>
                <Text style={styles.stageKeyNumber}>{stage.stage}</Text>
                <View style={styles.stageKeyTextWrap}>
                  <Text style={styles.stageKeyLabel}>{stage.label}</Text>
                  <Text style={styles.stageKeyMeta}>{durationWeeks} week{durationWeeks === 1 ? '' : 's'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  finishControls: { width: 92, borderWidth: 1, borderColor: '#c8d7e6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  finishButton: { backgroundColor: '#173b5f', padding: 8, borderRadius: 5, minWidth: 34, alignItems: 'center' },
  header: { gap: 4 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  generationPanel: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, gap: 8 },
  generationHelp: { color: '#64748b', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  inputWrapSmall: { gap: 6, minWidth: 180, flex: 1 },
  inputWrapRoute: { gap: 6, minWidth: 230, flex: 1 },
  houseTypeWrap: { gap: 6, minWidth: 260, flex: 2 },
  inputWrapWide: { gap: 6, minWidth: 320, flex: 2 },
  houseTypeSummary: { minWidth: 190, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  houseTypeSummaryTitle: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  houseTypeSummaryText: { color: '#64748b', fontWeight: '800', fontSize: 12, marginTop: 2 },
  label: { color: '#334155', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontWeight: '800' },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  saveButton: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: '#ffffff', fontWeight: '900' },
  routeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  routeChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff' },
  routeChipActive: { backgroundColor: '#173b5f', borderColor: '#173b5f' },
  routeChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  routeChipTextActive: { color: '#ffffff' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disabledButton: { backgroundColor: '#cbd5e1' },
  releaseButton: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  releaseButtonText: { color: '#0f172a', fontWeight: '900' },
  holdPanel: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, gap: 12 },
  holdStatus: { color: '#0f172a', fontWeight: '900', lineHeight: 20 },
  stageChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  stageChip: { width: 150, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 10, backgroundColor: '#ffffff' },
  stageChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  stageChipNumber: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  stageChipLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 3 },
  stageChipTextActive: { color: '#ffffff' },
  warningBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 14, padding: 14, gap: 4 },
  warningTitle: { color: '#9a3412', fontWeight: '900' },
  warningText: { color: '#9a3412', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  modeButtonActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  modeButtonActiveDanger: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  modeButtonText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  modeButtonTextActive: { color: '#ffffff' },
  resetText: { color: '#64748b', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  confirmText: { color: '#dc2626', fontSize: 13, lineHeight: 20, fontWeight: '900' },
  clearButton: { alignSelf: 'flex-start', backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  clearButtonArmed: { backgroundColor: '#991b1b' },
  clearButtonDisabled: { backgroundColor: '#cbd5e1' },
  clearButtonText: { color: '#ffffff', fontWeight: '900' },
  templateChips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  templateChip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
  templateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  templateChipText: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  templateChipTextActive: { color: '#ffffff' },
  tableRow: { flexDirection: 'row', minHeight: 38, alignItems: 'stretch' },
  altRow: { backgroundColor: '#f8fbff' },
  headerCell: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', fontSize: 12, padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  buildCell: { width: 62 },
  plotCell: { width: 90 },
  routeCell: { width: 118 },
  houseTypeCell: { width: 160 },
  templateCell: { width: 118 },
  holdCell: { width: 96 },
  weekInputCell: { width: 104 },
  completionCell: { width: 132 },
  actionCell: { width: 86 },
  actionButtonCell: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  manageButton: { backgroundColor: '#173b5f', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  manageButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  weekHeader: { width: 92, backgroundColor: '#173b5f', paddingHorizontal: 5, paddingVertical: 6, borderWidth: 1, borderColor: '#9fb6ce', alignItems: 'center', justifyContent: 'center' },
  weekHeaderWeek: { color: '#ffffff', fontWeight: '900', fontSize: 10, lineHeight: 13, textAlign: 'center' },
  weekHeaderDate: { color: '#ffffff', fontWeight: '800', fontSize: 9, lineHeight: 12, textAlign: 'center', marginTop: 2 },
  bodyCell: { color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '800' },
  holdBodyCell: { color: '#64748b', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  holdBodyCellActive: { backgroundColor: '#fee2e2', color: '#991b1b' },
  weekInputBody: { backgroundColor: '#fff4cc', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  stageStartBody: { backgroundColor: '#e3f3d8', color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  weekCell: { width: 92, color: '#0f172a', padding: 8, borderWidth: 1, borderColor: '#c8d7e6', textAlign: 'center', fontWeight: '900' },
  activeWeekCell: { backgroundColor: '#dff0ff' },
  heldWeekCell: { backgroundColor: '#fee2e2', color: '#991b1b' },
  emptyMatrixRow: { width: 1420, borderWidth: 1, borderColor: '#c8d7e6', backgroundColor: '#f8fafc', padding: 18 },
  emptyMatrixText: { color: '#64748b', fontWeight: '800' },
  removeButton: { width: 86, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c8d7e6' },
  removeButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '900' },
  stageKeyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stageKeyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 240, flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  stageKeyNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#173b5f', color: '#ffffff', textAlign: 'center', lineHeight: 34, fontWeight: '900' },
  stageKeyTextWrap: { flex: 1 },
  stageKeyLabel: { color: '#0f172a', fontWeight: '900' },
  stageKeyMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
});

