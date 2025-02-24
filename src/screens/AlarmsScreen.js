import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  Button,
  PermissionsAndroid,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchCamera } from "react-native-image-picker";
import PushNotification from "react-native-push-notification";
import axios from "axios";

const API_URL = "https://bob-esponja-yh539.ondigitalocean.app";

const AlarmsScreen = ({ navigation }) => {
  const [usuarioNSS, setUsuarioNSS] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await configureNotifications();
      await validateSession();
    };
    initialize();
  }, []);

  const configureNotifications = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    PushNotification.configure({
      onNotification: (notification) => {
        console.log("Notification received:", notification);
      },
      requestPermissions: Platform.OS === "ios",
    });
  };

  const validateSession = async () => {
    try {
      const storedData = await AsyncStorage.getItem("userData");
      if (storedData) {
        const user = JSON.parse(storedData);
        setUsuarioNSS(user.nss);
        await fetchAlarms(user.nss);
      } else {
        navigation.replace("LoginScreen");
      }
    } catch (error) {
      console.error("Error al validar la sesión:", error);
      Alert.alert("Error", "Ocurrió un problema al validar tu sesión. Inicia sesión nuevamente.");
      navigation.replace("LoginScreen");
    } finally {
      setLoading(false);
    }
  };

  const fetchAlarms = async (nss) => {
    try {
      const response = await axios.get(`${API_URL}/alarmas/${nss}`);
      if (response.status === 200) {
        const validAlarms = response.data.filter(
          (alarm) => !isNaN(new Date(alarm.hora_programada))
        );
        setAlarms(validAlarms);
        await AsyncStorage.setItem("alarms", JSON.stringify(validAlarms));
        scheduleAlarms(validAlarms);
      }
    } catch (error) {
      console.error("Error al obtener alarmas:", error);
    }
  };

  const scheduleAlarms = (alarms) => {
    alarms.forEach((alarm) => {
      const triggerTimestamp = new Date(alarm.hora_programada).getTime();

      if (triggerTimestamp <= Date.now()) {
        PushNotification.localNotification({
          channelId: "alarm-channel",
          title: "¡Alarma vencida!",
          message: `Toma tu medicamento: ${alarm.nombre_medicamento}`,
          playSound: true,
          soundName: "alarm.mp3",
        });
      } else {
        PushNotification.localNotificationSchedule({
          channelId: "alarm-channel",
          title: "¡Es hora de tomar tus medicamentos!",
          message: `Medicamento: ${alarm.nombre_medicamento}`,
          date: new Date(alarm.hora_programada),
          allowWhileIdle: true,
        });
      }
    });
  };

  const stopAlarm = async (alarm) => {
    try {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );

      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permiso denegado", "Se necesita acceso a la cámara para apagar la alarma.");
        return;
      }

      const options = {
        mediaType: "photo",
        saveToPhotos: true,
        cameraType: "back",
      };

      launchCamera(options, async (response) => {
        if (response.didCancel) {
          Alert.alert("❌ Error", "No se pudo capturar la foto. Inténtalo de nuevo.");
          return;
        }

        if (response.errorCode) {
          Alert.alert("❌ Error", `Error: ${response.errorMessage}`);
          return;
        }

        const imageUri = response.assets[0].uri;
        const formData = new FormData();

        formData.append("imagen", {
          uri: imageUri,
          name: `alarma_${alarm.id}_${Date.now()}.jpg`,
          type: "image/jpeg",
        });
        formData.append("id", alarm.id);
        formData.append("usuario_nss", usuarioNSS);

        const serverResponse = await axios.post(`${API_URL}/alarmas/apagar`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (serverResponse.status === 200) {
          Alert.alert("✔ Alarma apagada", "La foto ha sido registrada correctamente.");
          const updatedAlarms = alarms.filter((a) => a.id !== alarm.id);
          setAlarms(updatedAlarms);
          await AsyncStorage.setItem("alarms", JSON.stringify(updatedAlarms));
        } else {
          Alert.alert("❌ Error", "No se pudo apagar la alarma. Inténtalo de nuevo.");
        }
      });
    } catch (error) {
      console.error("❌ Error al apagar la alarma:", error);
      Alert.alert("❌ Error", "Hubo un problema al apagar la alarma.");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alarmas</Text>
      <FlatList
        data={alarms}
        renderItem={({ item }) => {
          const horaProgramada = new Date(item.hora_programada).toLocaleString();

          return (
            <View style={styles.alarmCard}>
              <Text style={styles.alarmText}>Medicamento: {item.nombre_medicamento}</Text>
              <Text style={styles.alarmText}>
                Hora programada: {isNaN(new Date(item.hora_programada)) ? "Hora no válida" : horaProgramada}
              </Text>
              <Button title="Apagar Alarma" onPress={() => stopAlarm(item)} />
            </View>
          );
        }}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FAF3DD" },
  title: { fontSize: 24, fontWeight: "bold", color: "#5E6472", textAlign: "center" },
  alarmCard: { backgroundColor: "#FFFFFF", padding: 15, borderRadius: 8, marginBottom: 10 },
  alarmText: { fontSize: 16, color: "#5E6472" },
});

export default AlarmsScreen;
