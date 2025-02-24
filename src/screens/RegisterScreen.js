import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from "react-native";
import axios from "axios";
import messaging from "@react-native-firebase/messaging";

const backendUrl = "https://bob-esponja-yh539.ondigitalocean.app";

const RegisterScreen = ({ navigation }) => {
  const [nss, setNss] = useState("");
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("Masculino");
  const [contraseña, setContraseña] = useState("");

  // 🔔 Solicitar permisos para notificaciones al iniciar el componente
  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("Permiso para notificaciones concedido.");
          } else {
            console.warn("Permiso para notificaciones denegado.");
          }
        } else {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            console.log("Permiso para notificaciones concedido:", authStatus);
          } else {
            console.warn("Permiso para notificaciones denegado.");
          }
        }
      } catch (error) {
        console.error("Error al solicitar permiso para notificaciones:", error);
      }
    };
    requestPermission();
  }, []);

  // 🔐 Registro del usuario
  const handleRegister = async () => {
    if (!nss || !nombre || !edad || !sexo || !contraseña) {
      Alert.alert("Error", "Todos los campos son obligatorios.");
      return;
    }

    if (nss.length !== 11 || isNaN(nss)) {
      Alert.alert("Error", "El NSS debe ser un número de 11 dígitos.");
      return;
    }

    if (parseInt(edad) < 0 || parseInt(edad) > 120) {
      Alert.alert("Error", "La edad ingresada no es válida.");
      return;
    }

    try {
      const response = await axios.post(`${backendUrl}/usuarios`, {
        nss,
        nombre,
        edad,
        sexo,
        contraseña,
      });

      if (response.status === 201) {
        // 🎯 Registro exitoso - Obtener token de FCM
        let fcmToken = "";
        try {
          fcmToken = await messaging().getToken();
          console.log("FCM Token:", fcmToken);

          // 🔗 Registrar el token en el backend
          await axios.post(`${backendUrl}/registrar-token`, {
            nss,
            token_expo: fcmToken, // Usamos el mismo campo
          });
        } catch (tokenError) {
          console.error("Error al obtener o registrar el token FCM:", tokenError);
        }

        Alert.alert("✅ Registro exitoso", "Usuario registrado correctamente.");
        navigation.navigate("LoginScreen");
      } else {
        Alert.alert("❌ Error", response.data.error || "Error al registrar usuario.");
      }
    } catch (error) {
      console.error("❌ Error en el servidor:", error);
      Alert.alert("❌ Error", "Error al conectar con el servidor.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registro</Text>

      <TextInput
        style={styles.input}
        placeholder="NSS (11 dígitos)"
        value={nss}
        onChangeText={setNss}
        keyboardType="numeric"
        maxLength={11}
      />

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
      />

      <TextInput
        style={styles.input}
        placeholder="Edad"
        value={edad}
        onChangeText={setEdad}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Selecciona tu sexo:</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.sexoButton,
            sexo === "Masculino" && styles.selectedButton,
          ]}
          onPress={() => setSexo("Masculino")}
        >
          <Text style={styles.buttonText}>Masculino</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sexoButton,
            sexo === "Femenino" && styles.selectedButton,
          ]}
          onPress={() => setSexo("Femenino")}
        >
          <Text style={styles.buttonText}>Femenino</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={contraseña}
        secureTextEntry
        onChangeText={setContraseña}
      />

      <Button title="Registrar" onPress={handleRegister} />

      <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
        <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión aquí</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// 🎨 Estilos
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAF3DD",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5E6472",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#B8F2E6",
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: "#5E6472",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sexoButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#B8F2E6",
  },
  selectedButton: {
    backgroundColor: "#5E6472",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  link: {
    color: "#5E6472",
    textDecorationLine: "underline",
    marginTop: 15,
  },
});

export default RegisterScreen;
