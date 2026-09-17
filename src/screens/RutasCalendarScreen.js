import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { PageContainer } from '../components/ui';
import { useThemeMode } from '../context/ThemeModeContext';
import { colors } from '../theme';
import { api } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSelectedUser } from '../context/SelectedUserContext';
import { partsFromISO, monthRange } from '../utils/schedule';
import { todayISO } from '../utils/rutas';
import RutasPlanner from '../components/RutasPlanner';
import SelectedUserBanner from '../components/SelectedUserBanner';

// Mismos datos que "Rutas por día", pero con un calendario de mes arriba (en
// vez de flechas día a día) para saltar directo a cualquier fecha y ver de
// un vistazo qué días tienen rutas.
export default function RutasCalendarScreen({ navigation }) {
  const { user, isAdmin } = useAuth();
  const { selectedUser } = useSelectedUser();
  const targetUser = isAdmin ? selectedUser : user;
  const { resolvedScheme } = useThemeMode();
  const themeColors = colors[resolvedScheme];

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [markedDates, setMarkedDates] = useState({});
  const initial = partsFromISO(selectedDate);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!targetUser) { setVehiclesLoaded(true); return; }
    api.get('/vehicles', { params: isAdmin ? { owner_id: targetUser.id } : {} })
      .then((resp) => setVehicles(resp.data))
      .catch(() => {})
      .finally(() => setVehiclesLoaded(true));
  }, [isAdmin, targetUser?.id]));

  const loadCounts = useCallback(async (y, m) => {
    if (!targetUser) { setMarkedDates({}); return; }
    try {
      const { from, to } = monthRange(y, m);
      const resp = await api.get('/rutas', {
        params: { date_from: from, date_to: to, ...(isAdmin ? { user_id: targetUser.id } : {}) },
      });
      const counts = {};
      resp.data.data
        .filter((ruta) => ruta.owner_id === targetUser.id)
        .forEach((ruta) => {
          const date = ruta.trip_date?.slice(0, 10);
          if (date) counts[date] = (counts[date] || 0) + 1;
        });
      const marks = {};
      Object.keys(counts).forEach((date) => {
        marks[date] = { marked: true, dotColor: themeColors.primary };
      });
      marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true, selectedColor: themeColors.primary };
      setMarkedDates(marks);
    } catch (err) {
      // Silencioso: los puntos de "hay rutas" son solo una ayuda visual.
    }
  }, [selectedDate, themeColors.primary, isAdmin, targetUser?.id]);

  useEffect(() => { loadCounts(year, month); }, [year, month, loadCounts]);

  if (isAdmin && !targetUser) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <SelectedUserBanner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {isAdmin && <SelectedUserBanner />}
      <PageContainer>
        <Calendar
          current={selectedDate}
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          onMonthChange={(m) => { setYear(m.year); setMonth(m.month); }}
        />
      </PageContainer>
      <View className="flex-1">
        <RutasPlanner
          key={targetUser.id}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          showDateBar={false}
          fetchParams={isAdmin ? { user_id: targetUser.id } : {}}
          filterRuta={(ruta) => ruta.owner_id === targetUser.id}
          createExtra={isAdmin ? { owner_id: targetUser.id } : {}}
          vehicles={vehicles}
          emptyMessage="No hay rutas este día."
          createBlocked={!isAdmin && vehiclesLoaded && vehicles.length === 0}
          createBlockedMessage="Paso 1: registra un vehículo antes de crear tu primera ruta"
          onCreateBlockedPress={() => navigation.navigate('MyVehicles')}
        />
      </View>
    </View>
  );
}
