import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeeklyInsights } from '../../api/dashboardApi';
import { dash } from '../../theme/dashboard';
import { fonts } from '../../theme/typography';
import { formatSignedMoney } from '../../utils/money';

type WeeklyProgressCardProps = {
  insights: WeeklyInsights;
  onOpenReviews?: () => void;
  onOpenDrills?: () => void;
};

export function WeeklyProgressCard({ insights, onOpenReviews, onOpenDrills }: WeeklyProgressCardProps) {
  const reviewedRatio = insights.loggedHands ? Math.round((insights.reviewedHands / insights.loggedHands) * 100) : 0;
  const profit = formatSignedMoney(insights.profitCents, 'USD');

  return (
    <View style={styles.shell}>
      <View style={styles.head}>
        <View>
          <Text style={styles.eyebrow}>WEEKLY PROGRESS</Text>
          <Text style={styles.title}>Your last 7 days</Text>
        </View>
        <Text style={[styles.profit, { color: insights.profitCents > 0 ? dash.profit : insights.profitCents < 0 ? dash.loss : dash.textSecondary }]}>{profit}</Text>
      </View>
      <View style={styles.metrics}>
        <Metric label="Sessions" value={String(insights.sessionCount)} />
        <Metric label="Hands logged" value={String(insights.loggedHands)} />
        <Metric label="Reviewed" value={`${reviewedRatio}%`} />
      </View>
      <View style={styles.plan}>
        <Ionicons name="sparkles-outline" size={18} color={dash.brandSoft} />
        <View style={styles.planCopy}>
          <Text style={styles.planTitle}>{insights.coachPlan.title}</Text>
          <Text style={styles.planBody}>{insights.coachPlan.body}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onOpenReviews} style={styles.ghost}><Text style={styles.ghostText}>Review</Text></Pressable>
        <Pressable onPress={onOpenDrills} style={styles.primary}><Text style={styles.primaryText}>Practice</Text></Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  shell: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(155,107,255,0.32)', backgroundColor: 'rgba(42,28,81,0.7)', padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: { color: dash.brandSoft, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2 },
  title: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 18, marginTop: 2 },
  profit: { fontFamily: fonts.displayBold, fontSize: 19 },
  metrics: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingVertical: 9 },
  metric: { flex: 1, gap: 1 }, metricValue: { color: dash.text, fontFamily: fonts.displayBold, fontSize: 17 }, metricLabel: { color: dash.textMuted, fontFamily: fonts.bodyMedium, fontSize: 10 },
  plan: { flexDirection: 'row', gap: 9, alignItems: 'center' }, planCopy: { flex: 1, gap: 1 }, planTitle: { color: dash.text, fontFamily: fonts.bodyBold, fontSize: 14 }, planBody: { color: dash.textSecondary, fontFamily: fonts.body, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9 }, ghost: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' }, ghostText: { color: dash.opsSoft, fontFamily: fonts.bodyBold, fontSize: 13 }, primary: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: dash.ops }, primaryText: { color: '#071426', fontFamily: fonts.bodyBold, fontSize: 13 },
});
