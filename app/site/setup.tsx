import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppScreen } from '../../components/AppScreen';
import { ProgrammeDatePicker } from '../../components/ProgrammeDatePicker';
import { SectionCard } from '../../components/SectionCard';
import { useSitePlanner } from '../../data/sitePlannerStore';
import { getProgrammeStartDateValue, normaliseBritishDate, validateWeekOneDate } from '../../utils/programmeDates';
import { ConfiguredProgrammeStage, readStageConfiguration, saveStageConfiguration } from '../../utils/stageConfiguration';
import { PROGRAMME_STAGE_SEQUENCE } from '../../utils/siteProgrammeEngine';
import { applyHouseTypeFloorConfiguration, getEffectiveProgrammeWeeks, getHouseTypeLabel, getHouseTypeTemplates, getStandardTemplateIdForBedrooms, PlotTemplate, TemplateActivity } from '../../utils/templateProgramme';

const LOCKED_STANDARD_KEY = 'programme-buddy:locked-three-bed-standard:v1';
const LOCKED_STAGE_COUNT = 9;


function orderedActivities(activities: TemplateActivity[]) {
  return activities.slice().sort((a, b) => a.order - b.order).map((activity, index) => ({ ...activity, order: index + 1 }));
}

function resequenceActivities(activities: TemplateActivity[]) {
  return activities.map((activity, index) => ({ ...activity, order: index + 1 }));
}

function cloneTemplate(template: PlotTemplate): PlotTemplate {
  return { ...template, activities: template.activities.map((activity) => ({ ...activity })) };
}

function toPositiveInt(value: string, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function SiteSetupScreen() {
  const router = useRouter();
  const { siteSetup, plotTemplates, isSitePlannerLoaded, updateSiteSetup, addPlotTemplate, updatePlotTemplate } = useSitePlanner();
  const [weekOneDate, setWeekOneDate] = useState(getProgrammeStartDateValue(siteSetup.programmeStartDate));
  const [workingDays, setWorkingDays] = useState<5 | 6 | 7>(siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5);
  const [stageDefinitions, setStageDefinitions] = useState<ConfiguredProgrammeStage[]>(PROGRAMME_STAGE_SEQUENCE.slice(0, LOCKED_STAGE_COUNT).map((stage) => ({ ...stage })));
  const [lockedThreeBed, setLockedThreeBed] = useState<PlotTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [draft, setDraft] = useState<PlotTemplate | null>(null);
  const [newHouseTypeName, setNewHouseTypeName] = useState('');
  const [newBedrooms, setNewBedrooms] = useState(3);
  const [newFloors, setNewFloors] = useState(2);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [weekOneDateError, setWeekOneDateError] = useState('');

  useEffect(() => {
    if (!isSitePlannerLoaded) return;
    let active = true;
    (async () => {
      const liveThreeBed = plotTemplates.find((template) => template.id === 'threeBed');
      if (!liveThreeBed) return;
      const existing = await AsyncStorage.getItem(LOCKED_STANDARD_KEY);
      const standard = existing ? JSON.parse(existing) as PlotTemplate : cloneTemplate(liveThreeBed);
      if (!existing) await AsyncStorage.setItem(LOCKED_STANDARD_KEY, JSON.stringify(standard));
      if (!active) return;
      setLockedThreeBed(standard);
      // Enforce the locked standard in the planner store as the source of truth.
      if (JSON.stringify(liveThreeBed) !== JSON.stringify(standard)) await updatePlotTemplate(standard);
    })().catch((error) => setMessage(`Unable to load locked 3 Bedroom standard: ${String(error)}`));
    return () => { active = false; };
  }, [isSitePlannerLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSitePlannerLoaded) return;
    readStageConfiguration(LOCKED_STAGE_COUNT)
      .then((stages) => setStageDefinitions(stages.slice(0, LOCKED_STAGE_COUNT)))
      .catch(() => setStageDefinitions(PROGRAMME_STAGE_SEQUENCE.slice(0, LOCKED_STAGE_COUNT).map((stage) => ({ ...stage }))));
  }, [isSitePlannerLoaded]);

  useEffect(() => {
    setWeekOneDate(getProgrammeStartDateValue(siteSetup.programmeStartDate));
    setWorkingDays(siteSetup.includeSunday ? 7 : siteSetup.includeSaturday ? 6 : 5);
  }, [siteSetup.programmeStartDate, siteSetup.includeSaturday, siteSetup.includeSunday]);

  const houseTypes = useMemo(() => getHouseTypeTemplates(plotTemplates), [plotTemplates]);
  const selectedTemplate = houseTypes.find((template) => template.id === selectedTemplateId) ?? houseTypes[0];
  const displayTemplate = draft ?? selectedTemplate;
  const selectedNeedsClassification = Boolean(selectedTemplate && (!selectedTemplate.bedrooms || !selectedTemplate.floors));
  const calculatedWeeks = displayTemplate ? getEffectiveProgrammeWeeks(displayTemplate, { ...siteSetup, includeSaturday: workingDays >= 6, includeSunday: workingDays >= 7 }) : 0;

  useEffect(() => {
    if (!selectedTemplateId && houseTypes[0]?.id) setSelectedTemplateId(houseTypes[0].id);
    if (selectedTemplateId && !houseTypes.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(houseTypes[0]?.id ?? '');
      setDraft(null);
    }
  }, [houseTypes, selectedTemplateId]);

  const saveSiteSettings = async () => {
    const dateError = validateWeekOneDate(weekOneDate);
    setWeekOneDateError(dateError);
    if (dateError) return;
    setSaving(true);
    try {
      const stages = stageDefinitions.slice(0, LOCKED_STAGE_COUNT).map((stage, index) => ({ ...stage, stage: index + 1 }));
      await saveStageConfiguration(stages);
      await updateSiteSetup({
        programmeStartDate: normaliseBritishDate(weekOneDate),
        stageCount: LOCKED_STAGE_COUNT,
        workingWeek: workingDays === 7 ? '7 days - Monday to Sunday' : workingDays === 6 ? '6 days - Monday to Saturday' : '5 days - Monday to Friday',
        includeSaturday: workingDays >= 6,
        includeSunday: workingDays >= 7,
      });
      setMessage('Site programme settings saved. The site is locked to 9 programme stages.');
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (stageNo: number, changes: Partial<ConfiguredProgrammeStage>) => {
    setStageDefinitions((current) => current.map((stage) => {
      if (stage.stage !== stageNo) return stage;
      const startWeek = toPositiveInt(String(changes.startWeek ?? stage.startWeek), stage.startWeek);
      const finishCandidate = toPositiveInt(String(changes.finishWeek ?? stage.finishWeek), stage.finishWeek);
      return { ...stage, ...changes, startWeek, finishWeek: Math.max(startWeek, finishCandidate) };
    }));
  };

  const beginEditTemplate = () => {
    if (!selectedTemplate) return;
    setDraft(cloneTemplate(selectedTemplate));
    setMessage(`Editing ${getHouseTypeLabel(selectedTemplate)}. Changes are local until Save House Type is pressed.`);
  };

  const cancelEditTemplate = () => {
    setDraft(null);
    setMessage('Template edit cancelled. Nothing was saved.');
  };

  const standardForBedrooms = (bedrooms: number) => {
    const standardId = getStandardTemplateIdForBedrooms(bedrooms);
    return standardId === 'threeBed'
      ? lockedThreeBed
      : plotTemplates.find((template) => template.id === standardId) ?? null;
  };

  const applyBedroomStandardToDraft = (bedrooms: number) => {
    setDraft((current) => {
      if (!current) return current;
      const standard = standardForBedrooms(bedrooms);
      if (!standard) return { ...current, bedrooms };
      const floors = current.floors ?? 2;
      return applyHouseTypeFloorConfiguration({
        ...cloneTemplate(standard),
        id: current.id,
        name: current.name,
        houseTypeCode: current.name,
        bedrooms,
        floors,
        isHouseType: true,
        isSystemTemplate: false,
        constructionMethod: undefined,
        description: `${bedrooms} bedroom · ${floors} storey house type`,
        standardVersion: standard.standardVersion,
        activities: standard.activities.map((activity) => ({ ...activity })),
      }, floors);
    });
    setMessage(`${bedrooms} Bedroom standard loaded into the draft. Press Save House Type to commit it.`);
  };

  const saveTemplate = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const withFloors = applyHouseTypeFloorConfiguration(draft, draft.floors ?? 2);
      const cleaned: PlotTemplate = {
        ...withFloors,
        name: withFloors.name.trim(),
        houseTypeCode: withFloors.name.trim(),
        description: `${withFloors.bedrooms ?? 3} bedroom · ${withFloors.floors ?? 2} storey house type`,
        stageCount: LOCKED_STAGE_COUNT,
        isHouseType: true,
        isSystemTemplate: false,
        activities: orderedActivities(withFloors.activities),
      };
      if (!cleaned.name) {
        setMessage('House type name is required.');
        return;
      }
      await updatePlotTemplate(cleaned);
      setDraft(null);
      setMessage(`${getHouseTypeLabel(cleaned)} saved successfully.`);
    } finally {
      setSaving(false);
    }
  };

  const resetSelectedToSiteStandard = () => {
    if (!selectedTemplate) return;
    const bedroomCount = selectedTemplate.bedrooms ?? 3;
    const standard = standardForBedrooms(bedroomCount);
    if (!standard) return;
    const reset = applyHouseTypeFloorConfiguration({
      ...cloneTemplate(standard),
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      houseTypeCode: selectedTemplate.name,
      bedrooms: bedroomCount,
      floors: selectedTemplate.floors ?? 2,
      isHouseType: true,
      isSystemTemplate: false,
      constructionMethod: undefined,
      description: selectedTemplate.description,
    }, selectedTemplate.floors ?? 2);
    setDraft(reset);
    setMessage(`House type programme reset from the ${bedroomCount === 4 ? '4 Bedroom' : '3 Bedroom'} standard. Press Save House Type to commit it.`);
  };

  const createHouseType = async () => {
    const name = newHouseTypeName.trim();
    if (!name) {
      setMessage('Enter a house type name first.');
      return;
    }
    setSaving(true);
    try {
      const created = await addPlotTemplate({
        name,
        bedrooms: newBedrooms,
        floors: newFloors,
        baseTemplateId: getStandardTemplateIdForBedrooms(newBedrooms),
      });
      setSelectedTemplateId(created.id);
      setDraft(null);
      setNewHouseTypeName('');
      setMessage(`${created.name} created from the ${created.bedrooms === 4 ? '4 Bedroom' : '3 Bedroom'} standard.${created.floors === 3 ? ' Three-storey joists, an extra brickwork/scaffold lift and additional fix durations were added automatically.' : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const patchDraftDetails = (changes: Partial<PlotTemplate>) => {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      return Object.prototype.hasOwnProperty.call(changes, 'floors')
        ? applyHouseTypeFloorConfiguration(next, Number(next.floors ?? 2))
        : next;
    });
  };

  const patchActivity = (order: number, changes: Partial<TemplateActivity>) => {
    setDraft((current) => current ? {
      ...current,
      activities: current.activities.map((activity) => activity.order === order ? { ...activity, ...changes } : activity),
    } : current);
  };

  const moveActivity = (order: number, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const activities = orderedActivities(current.activities);
      const index = activities.findIndex((activity) => activity.order === order);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= activities.length) return current;
      [activities[index], activities[target]] = [activities[target], activities[index]];
      return { ...current, activities: resequenceActivities(activities) };
    });
  };

  const addActivityAfter = (order: number) => {
    setDraft((current) => {
      if (!current) return current;
      const activities = orderedActivities(current.activities);
      const index = activities.findIndex((activity) => activity.order === order);
      const seed = activities[Math.max(0, index)] ?? activities[0];
      if (!seed) return current;
      const newActivity: TemplateActivity = {
        ...seed,
        order: index + 2,
        code: `New activity ${Date.now()}`,
        displayText: 'New',
        durationDays: 1,
        stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(String(seed.stage), 1)) as TemplateActivity['stage'],
      };
      activities.splice(index + 1, 0, newActivity);
      return { ...current, activities: resequenceActivities(activities) };
    });
  };

  const removeActivity = (order: number) => {
    setDraft((current) => current ? { ...current, activities: orderedActivities(current.activities.filter((activity) => activity.order !== order)) } : current);
  };

  const rows = displayTemplate ? orderedActivities(displayTemplate.activities) : [];

  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Programme setup</Text>
          <Text style={styles.subtitle}>Set the site calendar once, then create the named house types used on this development.</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}><Text style={styles.secondaryButtonText}>Back to dashboard</Text></Pressable>
      </View>

      <SectionCard title="Site programme settings" subtitle="These settings only change when you press Save Site Settings.">
        <View style={styles.settingsGrid}>
          <View style={styles.field}>
            <Text style={styles.label}>Week 1 commencement</Text>
            <ProgrammeDatePicker value={weekOneDate} onChange={(value) => { setWeekOneDate(value); setWeekOneDateError(''); }} error={Boolean(weekOneDateError)} />
            {weekOneDateError ? <Text style={styles.error}>{weekOneDateError}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Working week</Text>
            <View style={styles.chips}>
              {([5, 6, 7] as const).map((days) => <Pressable key={days} onPress={() => setWorkingDays(days)} style={[styles.chip, workingDays === days ? styles.chipActive : null]}><Text style={[styles.chipText, workingDays === days ? styles.chipTextActive : null]}>{days} days</Text></Pressable>)}
            </View>
          </View>
          <View style={styles.lockCard}><Text style={styles.lockLabel}>Programme stages</Text><Text style={styles.lockValue}>9</Text><Text style={styles.lockHint}>Locked site standard</Text></View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.stageTable}>
            <View style={styles.stageRow}><Text style={[styles.th, styles.stageNo]}>Stage</Text><Text style={[styles.th, styles.stageLabel]}>Label</Text><Text style={[styles.th, styles.stageWeek]}>Start week</Text><Text style={[styles.th, styles.stageWeek]}>Finish week</Text></View>
            {stageDefinitions.slice(0, LOCKED_STAGE_COUNT).map((stage) => <View key={stage.stage} style={styles.stageRow}>
              <Text style={[styles.td, styles.stageNo]}>{stage.stage}</Text>
              <TextInput value={stage.label} onChangeText={(value) => updateStage(stage.stage, { label: value })} style={[styles.input, styles.stageLabel]} />
              <TextInput defaultValue={String(stage.startWeek)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => updateStage(stage.stage, { startWeek: toPositiveInt(nativeEvent.text, stage.startWeek) })} style={[styles.input, styles.stageWeek]} />
              <TextInput defaultValue={String(stage.finishWeek)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => updateStage(stage.stage, { finishWeek: toPositiveInt(nativeEvent.text, stage.finishWeek) })} style={[styles.input, styles.stageWeek]} />
            </View>)}
          </View>
        </ScrollView>
        <Pressable disabled={saving} style={styles.primaryButton} onPress={saveSiteSettings}><Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Site Settings'}</Text></Pressable>
      </SectionCard>

      <SectionCard title="House types" subtitle="Create the named house types used on this development. Construction type is selected separately when a plot is added.">
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedTitle}>🔒 Standard programmes protected</Text>
          <Text style={styles.lockedText}>3 Bedroom house types keep your existing agreed programme. 4 Bedroom house types use the new agreed 4 Bedroom programme. These standards are copied into the named house type and are not shown as selectable property sizes.</Text>
        </View>

        <View style={styles.settingsGrid}>
          <View style={styles.field}>
            <Text style={styles.label}>New house type name</Text>
            <TextInput value={newHouseTypeName} onChangeText={setNewHouseTypeName} style={styles.input} placeholder="e.g. Warrley or Linngate" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Bedrooms</Text>
            <View style={styles.chips}>
              {[1, 2, 3, 4, 5, 6].map((count) => <Pressable key={count} onPress={() => setNewBedrooms(count)} style={[styles.chip, newBedrooms === count ? styles.chipActive : null]}><Text style={[styles.chipText, newBedrooms === count ? styles.chipTextActive : null]}>{count}</Text></Pressable>)}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Storeys</Text>
            <View style={styles.chips}>
              {[1, 2, 3].map((count) => <Pressable key={count} onPress={() => setNewFloors(count)} style={[styles.chip, newFloors === count ? styles.chipActive : null]}><Text style={[styles.chipText, newFloors === count ? styles.chipTextActive : null]}>{count}</Text></Pressable>)}
            </View>
          </View>
          <Pressable disabled={saving} style={styles.primaryButton} onPress={createHouseType}><Text style={styles.primaryButtonText}>{saving ? 'Creating…' : 'Create House Type'}</Text></Pressable>
        </View>

        {newFloors === 3 ? <View style={styles.messageBox}><Text style={styles.messageText}>Three-storey rule: adds another set of joists/flooring, one additional brickwork lift and scaffold lift before the roof sequence. After Roof Tile, carpentry, plumbing and electrical 1st/2nd fix activities each gain 1 day.</Text></View> : null}

        {houseTypes.length ? <>
          <View>
            <Text style={styles.label}>Development house types</Text>
            <View style={[styles.chips, { marginTop: 8 }]}>
              {houseTypes.map((template) => <Pressable key={template.id} onPress={() => { setSelectedTemplateId(template.id); setDraft(null); }} style={[styles.chip, selectedTemplate?.id === template.id ? styles.chipActive : null]}><Text style={[styles.chipText, selectedTemplate?.id === template.id ? styles.chipTextActive : null]}>{getHouseTypeLabel(template)}</Text></Pressable>)}
            </View>
          </View>

          {displayTemplate ? <>
            <View style={styles.templateSummary}>
              <View><Text style={styles.label}>House type</Text><Text style={styles.summaryValue}>{getHouseTypeLabel(displayTemplate)}</Text></View>
              <View><Text style={styles.label}>Bedrooms</Text><Text style={styles.summaryValue}>{displayTemplate.bedrooms ?? 'Not set'}</Text></View>
              <View><Text style={styles.label}>Storeys</Text><Text style={styles.summaryValue}>{displayTemplate.floors ?? 'Not set'}</Text></View>
              <View><Text style={styles.label}>Target weeks</Text><Text style={styles.summaryValue}>{displayTemplate.programmeWeeks}</Text></View>
              <View><Text style={styles.label}>Stages</Text><Text style={styles.summaryValue}>9</Text></View>
              <View style={styles.calculatedCard}><Text style={styles.calculatedLabel}>Calculated weeks</Text><Text style={styles.calculatedValue}>{calculatedWeeks}</Text></View>
            </View>

            {displayTemplate.floors === 3 ? <View style={styles.lockedBanner}><Text style={styles.lockedTitle}>3-storey programme rule active</Text><Text style={styles.lockedText}>Includes an additional set of joists/flooring, one extra brickwork/scaffold lift, and +1 day to carpentry, plumbing and electrical 1st/2nd fix activities after Roof Tile.</Text></View> : null}

            {selectedNeedsClassification && !draft ? <View style={styles.warningBanner}>
              <Text style={styles.warningTitle}>⚠ This house type still has the old unclassified programme</Text>
              <Text style={styles.warningText}>It was created before bedroom and storey data were added, so the app cannot know whether to apply the 3 Bedroom or 4 Bedroom standard. Click Complete House Type Setup, choose the correct bedroom count and storeys, then save. Selecting 4 bedrooms will immediately load the agreed 4 Bedroom programme.</Text>
            </View> : null}

            <View style={styles.actionRow}>
              {!draft ? <Pressable style={styles.primaryButton} onPress={beginEditTemplate}><Text style={styles.primaryButtonText}>{selectedNeedsClassification ? 'Complete House Type Setup' : 'Edit House Type'}</Text></Pressable> : null}
              {!draft && !selectedNeedsClassification ? <Pressable style={styles.secondaryButton} onPress={resetSelectedToSiteStandard}><Text style={styles.secondaryButtonText}>Reset Programme to {selectedTemplate?.bedrooms === 4 ? '4 Bedroom' : '3 Bedroom'} Standard</Text></Pressable> : null}
              {draft ? <Pressable disabled={saving} style={styles.primaryButton} onPress={saveTemplate}><Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save House Type'}</Text></Pressable> : null}
              {draft ? <Pressable style={styles.secondaryButton} onPress={cancelEditTemplate}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable> : null}
            </View>

            {draft ? <View style={styles.settingsGrid}>
              <View style={styles.field}><Text style={styles.label}>House type name</Text><TextInput value={draft.name} onChangeText={(value) => patchDraftDetails({ name: value, houseTypeCode: value })} style={styles.input} /></View>
              <View style={styles.field}><Text style={styles.label}>Bedrooms</Text><View style={styles.chips}>{[1,2,3,4,5,6].map((count) => <Pressable key={count} onPress={() => applyBedroomStandardToDraft(count)} style={[styles.chip, draft.bedrooms === count ? styles.chipActive : null]}><Text style={[styles.chipText, draft.bedrooms === count ? styles.chipTextActive : null]}>{count}</Text></Pressable>)}</View><Text style={styles.fieldHint}>Changing bedrooms reloads the matching standard programme. 4 Bedroom uses your new agreed schedule; all other current sizes use the existing 3 Bedroom standard until you define another standard.</Text></View>
              <View style={styles.field}><Text style={styles.label}>Storeys</Text><View style={styles.chips}>{[1,2,3].map((count) => <Pressable key={count} onPress={() => patchDraftDetails({ floors: count })} style={[styles.chip, draft.floors === count ? styles.chipActive : null]}><Text style={[styles.chipText, draft.floors === count ? styles.chipTextActive : null]}>{count}</Text></Pressable>)}</View></View>
            </View> : null}

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.activityTable}>
                <View style={styles.activityRow}>
                  <Text style={[styles.th, styles.seqCol]}>Seq</Text><Text style={[styles.th, styles.taskCol]}>Task</Text><Text style={[styles.th, styles.tradeCol]}>Trade</Text><Text style={[styles.th, styles.displayCol]}>Display</Text><Text style={[styles.th, styles.smallCol]}>Stage</Text><Text style={[styles.th, styles.smallCol]}>Days</Text>{draft ? <Text style={[styles.th, styles.actionCol]}>Actions</Text> : null}
                </View>
                {rows.map((activity) => <View key={`${activity.order}-${activity.code}`} style={styles.activityRow}>
                  <Text style={[styles.td, styles.seqCol]}>{activity.order}</Text>
                  {draft ? <TextInput value={activity.code} onChangeText={(value) => patchActivity(activity.order, { code: value })} style={[styles.input, styles.taskCol]} /> : <Text style={[styles.td, styles.taskCol]}>{activity.code}</Text>}
                  {draft ? <TextInput value={activity.trade} onChangeText={(value) => patchActivity(activity.order, { trade: value })} style={[styles.input, styles.tradeCol]} /> : <Text style={[styles.td, styles.tradeCol]}>{activity.trade}</Text>}
                  {draft ? <TextInput value={activity.displayText} onChangeText={(value) => patchActivity(activity.order, { displayText: value })} style={[styles.input, styles.displayCol]} /> : <Text style={[styles.td, styles.displayCol]}>{activity.displayText}</Text>}
                  {draft ? <TextInput defaultValue={String(activity.stage)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => patchActivity(activity.order, { stage: Math.min(LOCKED_STAGE_COUNT, toPositiveInt(nativeEvent.text, Number(activity.stage))) as TemplateActivity['stage'] })} style={[styles.input, styles.smallCol]} /> : <Text style={[styles.td, styles.smallCol]}>{activity.stage}</Text>}
                  {draft ? <TextInput defaultValue={String(activity.durationDays)} keyboardType="number-pad" onEndEditing={({ nativeEvent }) => patchActivity(activity.order, { durationDays: toPositiveInt(nativeEvent.text, activity.durationDays) })} style={[styles.input, styles.smallCol, styles.daysInput]} /> : <Text style={[styles.td, styles.smallCol, styles.daysCell]}>{activity.durationDays}</Text>}
                  {draft ? <View style={styles.rowActions}>
                    <Pressable style={styles.miniButton} onPress={() => moveActivity(activity.order, -1)}><Text style={styles.miniButtonText}>↑</Text></Pressable>
                    <Pressable style={styles.miniButton} onPress={() => moveActivity(activity.order, 1)}><Text style={styles.miniButtonText}>↓</Text></Pressable>
                    <Pressable style={styles.addButton} onPress={() => addActivityAfter(activity.order)}><Text style={styles.addButtonText}>+</Text></Pressable>
                    <Pressable style={styles.removeButton} onPress={() => removeActivity(activity.order)}><Text style={styles.removeButtonText}>−</Text></Pressable>
                  </View> : null}
                </View>)}
              </View>
            </ScrollView>
          </> : null}
        </> : <View style={styles.messageBox}><Text style={styles.messageText}>No house types have been created yet. Create Warrley, Linngate or any other development house type above.</Text></View>}
      </SectionCard>

      {message ? <View style={styles.messageBox}><Text style={styles.messageText}>{message}</Text></View> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 3 },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  field: { minWidth: 230, flex: 1, gap: 7 },
  label: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, color: '#0f172a', fontWeight: '800' },
  error: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { color: '#64748b', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#ffffff' },
  lockCard: { minWidth: 170, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12 },
  lockLabel: { color: '#1d4ed8', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  lockValue: { color: '#0f172a', fontWeight: '900', fontSize: 26, marginTop: 2 },
  lockHint: { color: '#64748b', fontSize: 11, marginTop: 2 },
  primaryButton: { alignSelf: 'flex-start', backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 },
  primaryButtonText: { color: '#ffffff', fontWeight: '900' },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 11 },
  secondaryButtonText: { color: '#0f172a', fontWeight: '900' },
  stageTable: { minWidth: 680 },
  stageRow: { flexDirection: 'row', alignItems: 'stretch' },
  th: { backgroundColor: '#173b5f', color: '#ffffff', fontWeight: '900', padding: 8, borderWidth: 1, borderColor: '#9fb6ce', textAlign: 'center' },
  td: { color: '#0f172a', fontWeight: '800', padding: 8, borderWidth: 1, borderColor: '#cbd5e1', textAlign: 'center', backgroundColor: '#ffffff' },
  stageNo: { width: 72 }, stageLabel: { width: 320 }, stageWeek: { width: 140 },
  templateSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  summaryValue: { color: '#0f172a', fontWeight: '900', fontSize: 15, marginTop: 3, minWidth: 120 },
  calculatedCard: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, minWidth: 130 },
  calculatedLabel: { color: '#1d4ed8', fontWeight: '900', fontSize: 11 },
  calculatedValue: { color: '#0f172a', fontWeight: '900', fontSize: 22 },
  lockedBanner: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 12, padding: 13, gap: 3 },
  lockedTitle: { color: '#166534', fontWeight: '900', fontSize: 14 },
  lockedText: { color: '#166534', fontWeight: '700', fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityTable: { minWidth: 1010 },
  activityRow: { flexDirection: 'row', alignItems: 'stretch' },
  seqCol: { width: 55 }, taskCol: { width: 250 }, tradeCol: { width: 190 }, displayCol: { width: 180 }, smallCol: { width: 80 }, actionCol: { width: 175 },
  daysCell: { backgroundColor: '#fff7cc' }, daysInput: { backgroundColor: '#fff7cc' },
  rowActions: { width: 175, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  miniButton: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  miniButtonText: { color: '#1d4ed8', fontWeight: '900' },
  addButton: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  addButtonText: { color: '#166534', fontWeight: '900' },
  removeButton: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  removeButtonText: { color: '#b91c1c', fontWeight: '900' },
  warningBanner: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 12, padding: 13, gap: 4 },
  warningTitle: { color: '#9a3412', fontWeight: '900', fontSize: 14 },
  warningText: { color: '#9a3412', fontWeight: '700', fontSize: 12, lineHeight: 18 },
  fieldHint: { color: '#64748b', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  messageBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12 },
  messageText: { color: '#334155', fontWeight: '800' },
});