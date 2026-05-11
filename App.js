// iita app shell. Mirrors etapa's App.js but with the cycling-specific
// bits stripped out. Keeps:
//   - Sentry init (conditional on EXPO_PUBLIC_SENTRY_DSN)
//   - Font loading + splash handoff
//   - OTA update check
//   - Auth gate (Supabase, with guest fallback)
//   - Navigation container with screen-view analytics hook
//
// Removes: in-app purchases, push notifications, remote config gating,
// force-upgrade screen, maintenance mode. Add them back if/when needed.

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const _cfg = Constants.expoConfig || Constants.manifest || {};
const _build =
  Platform.OS === 'ios'
    ? (_cfg.ios?.buildNumber || '0')
    : String(_cfg.android?.versionCode || 0);
const _release = `${_cfg.version || '0.0.0'}+${_build}`;

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enabled: true,
    debug: false,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
    release: _release,
    dist: _build,
    initialScope: {
      tags: {
        app_version: _cfg.version || 'unknown',
        build: _build,
        platform: Platform.OS,
      },
    },
  });
}

import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts, Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';

import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoadingSplash from './src/components/LoadingSplash';
import WebWrapper from './src/components/WebWrapper';
import analytics from './src/services/analyticsService';
import { getSession, getCurrentUser, signOut, onAuthStateChange } from './src/services/authService';
import { ensureUserData, hydrateFromServer, getUserPrefs } from './src/services/storageService';

import SignInScreen          from './src/screens/SignInScreen';
import HomeScreen            from './src/screens/HomeScreen';
import WeekIntakeScreen      from './src/screens/WeekIntakeScreen';
import DayDetailScreen       from './src/screens/DayDetailScreen';
import YearScreen            from './src/screens/YearScreen';
import AddEventScreen        from './src/screens/AddEventScreen';
import SettingsScreen        from './src/screens/SettingsScreen';
import InvitePartnerScreen   from './src/screens/InvitePartnerScreen';
import JoinPairScreen        from './src/screens/JoinPairScreen';
import ChecklistScreen       from './src/screens/ChecklistScreen';
import ActivityEditScreen    from './src/screens/ActivityEditScreen';
import GeneralAddScreen      from './src/screens/GeneralAddScreen';
import ListItemEditScreen    from './src/screens/ListItemEditScreen';
import OnboardingNameScreen  from './src/screens/OnboardingNameScreen';

// Deep-link handler. `iita://invite/<code>` opens the app on JoinPair
// with the code pre-filled. If the user isn't signed in yet, we stash
// the code in AsyncStorage and pick it up after sign-in.
const PENDING_INVITE_KEY = '@iita_pending_invite';

function parseInviteCode(url) {
  if (!url) return null;
  const m = url.match(/iita:\/\/invite\/([A-Z0-9]+)/i);
  return m ? m[1].toUpperCase() : null;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createStackNavigator();

const slide = ({ current, layouts }) => ({
  cardStyle: {
    transform: [{
      translateX: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.width * 0.25, 0],
      }),
    }],
    opacity: current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
    }),
  },
});

const slideUp = ({ current, layouts }) => ({
  cardStyle: {
    transform: [{
      translateY: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.height, 0],
      }),
    }],
  },
  overlayStyle: {
    opacity: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.4],
    }),
  },
});

function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const navigationRef = React.useRef(null);
  const routeNameRef = React.useRef(null);

  const [fontsLoaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    // ── OTA update check (no-op in dev) ──────────────────────────────
    if (Updates.isEnabled && !__DEV__) {
      (async () => {
        try {
          const r = await Updates.checkForUpdateAsync();
          if (r.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch {}
      })();
    }

    analytics.init();
    analytics.events.appOpened({ version: _cfg.version || 'unknown', platform: Platform.OS });

    getSession().then(async session => {
      if (session) {
        try {
          const user = await getCurrentUser();
          if (!user) {
            await signOut().catch(() => {});
            setInitialRoute('SignIn');
            return;
          }
        } catch {
          await signOut().catch(() => {});
          setInitialRoute('SignIn');
          return;
        }

        analytics.identify(session.user?.id, { email: session.user?.email });
        try { Sentry.setUser({ id: session.user?.id, email: session.user?.email }); } catch {}

        const cleared = await ensureUserData(session.user?.id);
        await hydrateFromServer({ force: cleared });

        const prefs = await getUserPrefs();
        setInitialRoute(prefs?.displayName ? 'Home' : 'OnboardingName');
      } else {
        setInitialRoute('SignIn');
      }
    });

    const unsubAuth = onAuthStateChange((user) => {
      if (!user && initialRoute && initialRoute !== 'SignIn') {
        try { analytics.reset(); } catch {}
        try { Sentry.setUser(null); } catch {}
        navigationRef.current?.reset({ index: 0, routes: [{ name: 'SignIn' }] });
      }
    });

    // ── Deep-link → JoinPair ─────────────────────────────────────────
    // If the app was launched by tapping an `iita://invite/<code>`
    // link, route there as soon as we know who the user is. Foreground
    // taps on the same scheme route immediately.
    async function routeInvite(url, { onlyIfSignedIn = false } = {}) {
      const code = parseInviteCode(url);
      if (!code) return;
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code);
      const session = await getSession();
      if (!session && onlyIfSignedIn) return; // wait for sign-in
      const nav = navigationRef.current;
      if (!nav) return;
      // Wait a tick so NavigationContainer is mounted on cold start.
      setTimeout(() => {
        try { nav.navigate('JoinPair', { code }); } catch {}
      }, 50);
    }

    Linking.getInitialURL().then(url => routeInvite(url, { onlyIfSignedIn: true }));
    const linkSub = Linking.addEventListener('url', ({ url }) => routeInvite(url));

    return () => { unsubAuth(); linkSub?.remove?.(); };
  }, []);

  useEffect(() => {
    if (fontsLoaded && initialRoute) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, initialRoute]);

  const onLayoutRootView = useCallback(async () => {}, []);

  if (!fontsLoaded || !initialRoute) return <LoadingSplash />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <WebWrapper>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => { routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name; }}
              onStateChange={() => {
                const prev = routeNameRef.current;
                const current = navigationRef.current?.getCurrentRoute()?.name;
                if (current && current !== prev) {
                  analytics.events.screenViewed(current);
                }
                routeNameRef.current = current;
              }}
            >
              <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                  headerShown: false,
                  cardStyle: { backgroundColor: '#000000' },
                  cardStyleInterpolator: slide,
                }}
              >
                <Stack.Screen name="SignIn"      component={SignInScreen} />
                <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
                <Stack.Screen name="Home"        component={HomeScreen} />
                <Stack.Screen
                  name="WeekIntake"
                  component={WeekIntakeScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
                <Stack.Screen name="DayDetail"   component={DayDetailScreen} />
                <Stack.Screen
                  name="ActivityEdit"
                  component={ActivityEditScreen}
                  options={{
                    gestureDirection: 'vertical',
                    cardStyleInterpolator: slideUp,
                    cardStyle: { backgroundColor: 'transparent' },
                    cardOverlayEnabled: true,
                  }}
                />
                <Stack.Screen name="Year"        component={YearScreen} />
                <Stack.Screen
                  name="AddEvent"
                  component={AddEventScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
                <Stack.Screen name="Settings"    component={SettingsScreen} />
                <Stack.Screen
                  name="InvitePartner"
                  component={InvitePartnerScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
                <Stack.Screen
                  name="JoinPair"
                  component={JoinPairScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
                <Stack.Screen
                  name="Todo"
                  component={ChecklistScreen}
                  initialParams={{ kind: 'todo' }}
                />
                <Stack.Screen
                  name="Wishlist"
                  component={ChecklistScreen}
                  initialParams={{ kind: 'wish' }}
                />
                <Stack.Screen
                  name="GeneralAdd"
                  component={GeneralAddScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
                <Stack.Screen
                  name="ListItemEdit"
                  component={ListItemEditScreen}
                  options={{ gestureDirection: 'vertical', cardStyleInterpolator: slideUp }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </View>
        </WebWrapper>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default process.env.EXPO_PUBLIC_SENTRY_DSN ? Sentry.wrap(App) : App;
