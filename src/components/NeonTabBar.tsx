import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dash } from '../theme/dashboard';
import { fonts } from '../theme/typography';
import { TABS, type AppTab } from '../navigation/tabs';
import { TabIcon } from './TabIcon';

type NeonTabBarProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
};

export function NeonTabBar({ active, onChange }: NeonTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom - 2, 8);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.dockShadow}>
        <LinearGradient
          colors={['#1A2238', '#111827']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.dock}
        >
          <View style={styles.rim} pointerEvents="none" />
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onChange(tab.key)}
                style={({ pressed }) => [
                  styles.item,
                  isActive && styles.itemActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                {isActive ? (
                  <View style={styles.activeGlow} pointerEvents="none">
                    <LinearGradient
                      colors={[
                        'rgba(77, 163, 255, 0.28)',
                        'rgba(77, 163, 255, 0.06)',
                        'transparent',
                      ]}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                ) : null}
                <TabIcon
                  name={tab.key}
                  color={isActive ? dash.opsSoft : 'rgba(255,255,255,0.42)'}
                  size={22}
                  active={isActive}
                />
                <Text
                  style={[styles.label, isActive && styles.labelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {isActive ? <View style={styles.activeBar} /> : <View style={styles.activeBarSlot} />}
              </Pressable>
            );
          })}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  dockShadow: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: 16,
      },
      default: {},
    }),
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 22,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 16,
    gap: 5,
    overflow: 'hidden',
  },
  itemActive: {
    backgroundColor: 'rgba(77, 163, 255, 0.1)',
  },
  activeGlow: {
    ...StyleSheet.absoluteFill,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.42)',
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
  },
  activeBarSlot: {
    height: 2,
    width: 14,
    marginTop: 1,
  },
  activeBar: {
    height: 2,
    width: 14,
    borderRadius: 1,
    backgroundColor: dash.ops,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.82,
  },
});
