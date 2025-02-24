import React from "react";
import { View, Text, Button, Alert, StyleSheet } from "react-native";
import { launchCamera } from "react-native-image-picker";
import axios from "axios";

const API_URL = "https://bob-esponja-yh539.ondigitalocean.app";

const ActiveAlarmScreen = ({ route, navigation }) => {
  const { alarm, usuarioNSS } = route.params; // Recibe los datos de navegación

  // Función para detener la alarma
  const stopAlarm = async () => {
    try {
      // Opciones de la cámara
      const options = {
        mediaType: "photo",
        saveToPhotos: true,
        cameraType: "back",
      };

      // Lanza la cámara
      launchCamera(options, async (response) => {
        if (response.didCancel) {
          Alert.alert("❌ Error", "No se pudo capturar la foto. Inténtalo de nuevo.");
          return;
        }

        if (response.errorCode) {
          Alert.alert("❌ Error", `Error: ${response.errorMessage}`);
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const imageUri = response.assets[0].uri;

          // Crear FormData para enviar la foto
          const formData = new FormData();
          formData.append("imagen", {
            uri: imageUri,
            name: `alarma_${alarm.id}_${Date.now()}.jpg`,
            type: "image/jpeg",
          });
          formData.append("id", alarm.id);
          formData.append("usuario_nss", usuarioNSS);

          // Enviar la imagen al backend
          const serverResponse = await axios.post(`${API_URL}/alarmas/apagar`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          if (serverResponse.status === 200) {
            Alert.alert("✔ Alarma apagada", "La foto ha sido registrada correctamente.");
            navigation.goBack();
          } else {
            Alert.alert("❌ Error", "No se pudo apagar la alarma. Inténtalo de nuevo.");
          }
        } else {
          Alert.alert("❌ Error", "No se pudo capturar la foto. Inténtalo de nuevo.");
        }
      });
    } catch (error) {
      console.error("❌ Error al apagar la alarma:", error);
      Alert.alert("❌ Error", "Hubo un problema al apagar la alarma.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Es hora de tomar tus medicamentos!</Text>
      <Text style={styles.alarmText}>Medicamento: {alarm.nombre_medicamento}</Text>
      <Text style={styles.alarmText}>
        Hora programada: {new Date(alarm.hora_programada).toLocaleString()}
      </Text>
      <Button title="Tomar Foto para Apagar" onPress={stopAlarm} />
    </View>
  );
};

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAF3DD",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5E6472",
    textAlign: "center",
    marginBottom: 20,
  },
  alarmText: {
    fontSize: 16,
    color: "#5E6472",
    marginVertical: 10,
    textAlign: "center",
  },
});

export default ActiveAlarmScreen;
