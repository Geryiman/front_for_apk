import React, { useEffect, useState, useRef } from "react";
import AppNavigator from "./src/navigation/AppNavigator"; // Importa la navegación
import { Alert, Platform } from "react-native";
import PushNotification from "react-native-push-notification";
import DeviceInfo from "react-native-device-info";

export default function App() {
  const [deviceToken, setDeviceToken] = useState(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    configurarNotificaciones();
  }, []);

  const configurarNotificaciones = async () => {
    // Crear canal de notificaciones en Android
    PushNotification.createChannel(
      {
        channelId: "alarm-channel",
        channelName: "Alarmas de Medicamentos",
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Canal creado: ${created}`)
    );

    // Verificar permisos
    if (Platform.OS === "android") {
      const isGranted = await solicitarPermisosAndroid();
      if (!isGranted) {
        Alert.alert("Permiso denegado", "No se pueden enviar notificaciones sin permisos.");
        return;
      }
    }

    // Obtener el token único del dispositivo
    const token = DeviceInfo.getUniqueId();
    console.log("🔑 Token del dispositivo:", token);
    setDeviceToken(token);
    await enviarTokenAlBackend(token);

    // Escuchar cuando llega una notificación
    PushNotification.configure({
      onNotification: (notification) => {
        console.log("📢 Notificación recibida:", notification);
        const { screen, medicamento_id } = notification.data;
        if (screen) {
          navigationRef.current?.navigate(screen, { medicamento_id });
        }
      },
      requestPermissions: true,
    });
  };

  // 🔹 Solicitar permisos en Android
  const solicitarPermisosAndroid = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error("Error al solicitar permisos:", err);
      return false;
    }
  };

  // 🔹 Enviar el token al backend
  async function enviarTokenAlBackend(token) {
    try {
      const response = await fetch("https://bob-esponja-yh539.ondigitalocean.app/registrar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nss: "12345678901", token_expo: token }),
      });

      if (!response.ok) {
        console.error("❌ Error al registrar el token en el backend.");
      }
    } catch (error) {
      console.error("❌ Error en la solicitud al backend:", error);
    }
  }

  return <AppNavigator ref={navigationRef} />; // Renderiza la navegación completa
}
