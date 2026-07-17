import { Children, isValidElement, ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

function getProgrammeHeaderRowCount(title: string) {
  if (title === 'Daily Plot Breakdown') return 2;
  if (title === 'Master stage-number matrix') return 1;
  if (title === 'Rolling programme') return 2;

  const normalised = title.trim().toUpperCase();
  if (normalised.startsWith('2 WEEK ') && normalised.endsWith(' PROGRAMME')) return 2;

  return 0;
}

function StickyProgrammeGrid({ scrollElement, headerRowCount }: { scrollElement: ReactElement<any>; headerRowCount: number }) {
  const { height } = useWindowDimensions();
  const maxHeight = Math.max(260, Math.min(720, Math.round(height * 0.62)));
  const tableElement = Children.toArray(scrollElement.props.children)[0];

  if (!isValidElement(tableElement)) return scrollElement;

  const rows = Children.toArray((tableElement.props as { children?: ReactNode }).children);
  if (rows.length <= headerRowCount) return scrollElement;

  const headerRows = rows.slice(0, headerRowCount);
  const bodyRows = rows.slice(headerRowCount);

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={scrollElement.props.showsHorizontalScrollIndicator !== false}
      contentContainerStyle={styles.horizontalTableContent}
    >
      <ScrollView
        nestedScrollEnabled
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator
        style={[styles.verticalTableScroll, { maxHeight }]}
        contentContainerStyle={styles.verticalTableContent}
      >
        <View collapsable={false} style={styles.stickyHeaderBlock}>
          {headerRows}
        </View>
        {bodyRows}
      </ScrollView>
    </ScrollView>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const programmeHeaderRowCount = getProgrammeHeaderRowCount(title);
  const renderedChildren = Children.map(children, (child) => {
    if (!programmeHeaderRowCount || !isValidElement(child)) return child;

    const element = child as ReactElement<any>;
    if (!element.props.horizontal) return child;

    return (
      <StickyProgrammeGrid
        key={element.key ?? `sticky-programme-grid-${title}`}
        scrollElement={element}
        headerRowCount={programmeHeaderRowCount}
      />
    );
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {renderedChildren}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
  },
  header: {
    gap: 3,
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
  },
  horizontalTableContent: {
    alignItems: 'flex-start',
  },
  verticalTableScroll: {
    alignSelf: 'flex-start',
  },
  verticalTableContent: {
    alignItems: 'flex-start',
  },
  stickyHeaderBlock: {
    alignSelf: 'flex-start',
    backgroundColor: '#173b5f',
    zIndex: 20,
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
});