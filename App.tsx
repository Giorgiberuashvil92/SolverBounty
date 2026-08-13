import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { DrillsScreen } from './src/screens/DrillsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CoachScreen } from './src/screens/CoachScreen';
import { ReviewsScreen } from './src/screens/ReviewsScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AppBackground } from './src/components/AppBackground';
import { NeonTabBar } from './src/components/NeonTabBar';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { dash } from './src/theme/dashboard';
import type { AppTab } from './src/navigation/tabs';
import type { DrillRecommendation } from './src/api/dashboardApi';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppShell({ onLayout }: { onLayout?: () => void }) {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<AppTab>('daily');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);
  const [drillRecommendation, setDrillRecommendation] = useState<DrillRecommendation | null>(null);
  const [drillRecommendationSessionId, setDrillRecommendationSessionId] = useState<string | null>(null);

  if (loading) {
    return (
      <AppBackground style={[styles.shell, styles.bootCenter]} onLayout={onLayout}>
        <ActivityIndicator color={dash.brand} />
      </AppBackground>
    );
  }

  if (!user) {
    return (
      <AppBackground style={styles.shell} onLayout={onLayout}>
        <StatusBar style="light" />
        <AuthScreen />
      </AppBackground>
    );
  }

  if (showProfile) {
    return (
      <AppBackground style={styles.shell} onLayout={onLayout}>
        <StatusBar style="light" />
        <ProfileScreen
          onBack={() => setShowProfile(false)}
          onEditSetup={() => {
            setShowProfile(false);
            setShowOnboarding(true);
          }}
        />
      </AppBackground>
    );
  }

  if (!user.onboardingCompleted || showOnboarding) {
    return (
      <AppBackground style={styles.shell} onLayout={onLayout}>
        <StatusBar style="light" />
        <OnboardingScreen onFinished={() => setShowOnboarding(false)} />
      </AppBackground>
    );
  }

  return (
    <AppBackground style={styles.shell} onLayout={onLayout}>
      <StatusBar style="light" />
      <View style={styles.body}>
        {tab === 'daily' ? (
          <DashboardScreen
            onOpenCoachTab={() => setTab('coach')}
            onOpenCoachChat={() => setTab('coach')}
            onOpenProfile={() => setShowProfile(true)}
            onOpenReviews={() => setTab('reviews')}
            onOpenDrills={(context) => {
              setDrillRecommendation(context?.recommendation ?? null);
              setDrillRecommendationSessionId(context?.sessionId ?? null);
              setTab('drills');
            }}
            onOpenCommunity={() => setTab('community')}
          />
        ) : null}
        {tab === 'community' ? <CommunityScreen /> : null}
        {tab === 'coach' ? <CoachScreen /> : null}
  {tab === 'reviews' ? (
    <ReviewsScreen
      onOpenDaily={() => setTab('daily')}
      onOpenCommunity={() => setTab('community')}
      onOpenDrills={() => setTab('drills')}
    />
  ) : null}
        {tab === 'drills' ? (
          <DrillsScreen
            recommendation={drillRecommendation}
            recommendationSessionId={drillRecommendationSessionId}
            onImmersiveChange={setHideTabBar}
          />
        ) : null}
      </View>
      {!hideTabBar ? <NeonTabBar active={tab} onChange={setTab} /> : null}
    </AppBackground>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  const onLayoutRoot = useCallback(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell onLayout={onLayoutRoot} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  bootCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shell: {
    flex: 1,
    backgroundColor: dash.bg,
  },
  body: {
    flex: 1,
  },
});
