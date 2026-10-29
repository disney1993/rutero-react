import React, { useEffect } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Avatar from '../components/ui/Avatar';
import Icon from '../components/ui/Icon';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { getInitials, resolveAvatarColor } from '../utils/avatar';
import { haptics } from '../utils/haptics';

export const TAB_BAR_HEIGHT = 52;

// Degradado del anillo del avatar activo (guiño a las "stories").
const RING_COLORS = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'];

function ProfileTabIcon({ focused, themeColors }) {
  const { user } = useAuth();
  const avatar = (
    <Avatar.Text
      size={focused ? 24 : 26}
      label={getInitials(user?.first_name, user?.last_name)}
      color={resolveAvatarColor(user?.avatar_color)}
    />
  );
  if (!focused) return avatar;
  return (
    <LinearGradient colors={RING_COLORS} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.ring}>
      <View style={[styles.ringGap, { backgroundColor: themeColors.background }]}>{avatar}</View>
    </LinearGradient>
  );
}

function TabItem({ route, descriptor, focused, navigation, themeColors }) {
  const { options } = descriptor;
  const scale = useSharedValue(1);

  // Pequeño "pop" con muelle al activarse, como en Instagram.
  useEffect(() => {
    if (focused) {
      scale.value = withSequence(withTiming(0.82, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 }));
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = () => {
    haptics.selection();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    // Si ya está activa, React Navigation hace scroll-to-top / pop-to-top por
    // el evento tabPress; si no, cambiamos de pestaña.
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const onLongPress = () => {
    navigation.emit({ type: 'tabLongPress', target: route.key });
    if (options.onLongPressNavigate) {
      haptics.heavy();
      options.onLongPressNavigate(navigation);
    }
  };

  const color = focused ? themeColors.onSurface : themeColors.onSurfaceVariant;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      hitSlop={6}
      android_ripple={{ color: themeColors.border, borderless: true, radius: 26 }}
      style={styles.item}
    >
      <Animated.View style={animatedStyle}>
        {options.isProfileTab ? (
          <ProfileTabIcon focused={focused} themeColors={themeColors} />
        ) : (
          <Icon name={focused ? options.iconFocused : options.icon} size={27} color={color} />
        )}
      </Animated.View>
      {!!options.tabBarBadge && (
        <View style={[styles.badge, { backgroundColor: themeColors.error, borderColor: themeColors.background }]} />
      )}
    </Pressable>
  );
}

// Barra inferior estilo Instagram: solo iconos (contorno → relleno al
// activarse), separador finísimo, avatar del usuario en la última pestaña y
// respeta el área segura (home indicator en iOS, barra de gestos en Android).
export default function InstaTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') return null;

  const content = (
    <View style={[styles.row, { height: TAB_BAR_HEIGHT }]}>
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          descriptor={descriptors[route.key]}
          focused={state.index === index}
          navigation={navigation}
          themeColors={themeColors}
        />
      ))}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0),
          borderTopColor: themeColors.border,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : themeColors.background,
        },
      ]}
    >
      {Platform.OS === 'ios' && (
        <BlurView
          tint={resolvedScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          intensity={100}
          style={StyleSheet.absoluteFill}
        />
      )}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  ring: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGap: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: '32%',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
});
