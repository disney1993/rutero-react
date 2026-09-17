import React, { useMemo, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Card, Button, Input } from '../components/ui';
import { api, errorMessage } from '../utils/apiClient';
import { isValidName } from '../utils/validators';
import { useAuth } from '../context/AuthContext';
import { toastError } from '../utils/toast';

function validate({ firstName, lastName, secondLastName }) {
  const errors = {};
  if (!firstName.trim()) errors.firstName = 'El nombre es obligatorio';
  else if (!isValidName(firstName)) errors.firstName = 'Solo letras, entre 2 y 50 caracteres';

  if (!lastName.trim()) errors.lastName = 'El apellido es obligatorio';
  else if (!isValidName(lastName)) errors.lastName = 'Solo letras, entre 2 y 50 caracteres';

  if (secondLastName.trim() && !isValidName(secondLastName)) {
    errors.secondLastName = 'Solo letras, entre 2 y 50 caracteres';
  }

  return errors;
}

// Pantalla bloqueante: se muestra en vez del resto de la app cuando el
// usuario entró con Google y Google no devolvió nombre/apellido. No tiene
// menú ni forma de navegar a otro lado salvo guardar o cerrar sesión.
export default function CompleteProfileScreen() {
  const { user, updateUser, logout } = useAuth();

  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [secondLastName, setSecondLastName] = useState(user.second_last_name || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(
    () => validate({ firstName, lastName, secondLastName }),
    [firstName, lastName, secondLastName]
  );

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      toastError('Revisa los datos marcados en rojo');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.patch('/user', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
      });
      await updateUser(resp.data);
    } catch (err) {
      toastError(errorMessage(err, 'No se pudo guardar tu perfil'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: '100%' }}
        className="bg-background dark:bg-background-dark"
        keyboardShouldPersistTaps="handled"
      >
        <Card className="w-full max-w-[440px]">
          <Card.Content className="py-6">
            <Text className="text-2xl font-bold text-center text-onSurface dark:text-onSurface-dark">
              Completa tu perfil
            </Text>
            <Text className="text-sm text-center mb-6 mt-1 text-onSurfaceVariant dark:text-onSurfaceVariant-dark">
              Nos faltan tu nombre y apellido para poder continuar
            </Text>

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Input
                  label="Nombre"
                  value={firstName}
                  onChangeText={setFirstName}
                  error={submitted ? errors.firstName : undefined}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Primer apellido"
                  value={lastName}
                  onChangeText={setLastName}
                  error={submitted ? errors.lastName : undefined}
                />
              </View>
            </View>

            <Input
              label="Segundo apellido (opcional)"
              value={secondLastName}
              onChangeText={setSecondLastName}
              error={submitted ? errors.secondLastName : undefined}
            />

            <Button mode="contained" onPress={save} loading={loading} disabled={loading} className="mt-2">
              Guardar y continuar
            </Button>
            <Button mode="text" onPress={logout} className="mt-1">
              Cerrar sesión
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
