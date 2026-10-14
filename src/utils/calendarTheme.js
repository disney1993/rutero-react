import { useMemo } from 'react';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';

// Tema de react-native-calendars a juego con el de la app. Sin esto el
// calendario se pintaba siempre en claro (fondo blanco) también en modo oscuro.
// La librería cachea los estilos al montar: quien lo use debe poner
// `key={scheme}` en el <Calendar> para que se regenere al cambiar de tema.
export function useCalendarTheme() {
  const { resolvedScheme } = useThemeMode();
  return useMemo(() => {
    const c = colors[resolvedScheme];
    return {
      scheme: resolvedScheme,
      theme: {
        calendarBackground: 'transparent',
        backgroundColor: 'transparent',
        monthTextColor: c.onSurface,
        textMonthFontWeight: '700',
        textSectionTitleColor: c.onSurfaceVariant,
        dayTextColor: c.onSurface,
        todayTextColor: c.primary,
        todayBackgroundColor: 'transparent',
        selectedDayBackgroundColor: c.primary,
        selectedDayTextColor: '#FFFFFF',
        textDisabledColor: resolvedScheme === 'dark' ? '#5E587F' : '#B7B0C9',
        dotColor: c.primary,
        selectedDotColor: '#FFFFFF',
        arrowColor: c.primary,
        disabledArrowColor: c.border,
        indicatorColor: c.primary,
      },
    };
  }, [resolvedScheme]);
}
