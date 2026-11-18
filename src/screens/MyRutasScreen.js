import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import RutasPlanner from '../components/RutasPlanner';

export default function MyRutasScreen({ navigation }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get('/vehicles')
      .then((resp) => setVehicles(resp.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []));

  return (
    <RutasPlanner
      filterRuta={(ruta) => ruta.owner_id === user.id}
      vehicles={vehicles}
      emptyMessage="No hay rutas este día. Toca + para crear una."
      createBlocked={loaded && vehicles.length === 0}
      createBlockedMessage="Paso 1: registra un vehículo antes de crear tu primera ruta"
      onCreateBlockedPress={() => navigation.navigate('MyVehicles')}
    />
  );
}
