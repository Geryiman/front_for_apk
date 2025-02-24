import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  PermissionsAndroid,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import messaging from "@react-native-firebase/messaging";

const backendUrl = "https://bob-esponja-yh539.ondigitalocean.app";

const LoginScreen = ({ navigation }) => {
  const [nss, setNss] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Solicitar permiso para notificaciones en Android
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

  const handleLogin = async () => {
    Keyboard.dismiss(); // Ocultar el teclado

    if (!nss || !password) {
      Alert.alert("Error", "El NSS y la contraseña son obligatorios.");
      return;
    }

    if (nss.length !== 11 || isNaN(nss)) {
      Alert.alert("Error", "El NSS debe ser un número de 11 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/login`, {
        nss,
        contraseña: password,
      });

      if (response.status === 200) {
        const userData = response.data.usuario;
        await AsyncStorage.setItem("userData", JSON.stringify(userData));

        // Obtener el token de FCM
        let fcmToken = "";
        try {
          fcmToken = await messaging().getToken();
          console.log("FCM Token:", fcmToken);

          // Registrar el token en el backend
          await axios.post(`${backendUrl}/registrar-token`, {
            nss,
            token_expo: fcmToken, // Se mantiene el nombre para compatibilidad
          });
        } catch (tokenError) {
          console.error("Error al obtener o registrar el token FCM:", tokenError);
        }

        navigation.replace("HomeScreen");
      }
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data.error || "Credenciales inválidas.";
        Alert.alert("Error", errorMessage);
      } else if (error.request) {
        Alert.alert("Error", "No se pudo conectar al servidor. Verifica tu conexión.");
      } else {
        console.error("Error inesperado:", error.message);
        Alert.alert("Error", "Ocurrió un error inesperado. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{
          uri: "https://salud-magenes.sfo2.digitaloceanspaces.com/imagenes/pilli.jpg",
        }}
        style={styles.logo}
      />
      <Text style={styles.title}>Iniciar Sesión</Text>

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
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#5E6472" style={{ marginBottom: 20 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
        <Text style={styles.link}>¿No tienes cuenta? Regístrate aquí</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAF3DD",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
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
  button: {
    backgroundColor: "#5E6472",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    color: "#5E6472",
    textDecorationLine: "underline",
    marginTop: 15,
  },
});

export default LoginScreen;
