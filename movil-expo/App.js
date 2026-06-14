import React, { useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useEffect } from 'react';
import Constants from 'expo-constants';

/**
 * Gestión Pro Total — envoltorio Expo para PROBAR la app en el móvil con Expo Go.
 *
 * Cómo probar (sin publicar nada en internet):
 *   1. En tu PC, sirve la app compilada:   npx serve ../dist   (o `npm run dev`)
 *   2. Mira la IP local de tu PC (p.ej. 192.168.1.40).
 *   3. Pon esa URL en APP_URL abajo (http://192.168.1.40:3000).
 *   4. En esta carpeta:  npx expo start
 *   5. Abre Expo Go en el móvil y escanea el QR. El móvil debe estar en la
 *      MISMA red WiFi que el PC.
 *
 * También puedes apuntar APP_URL a tu web ya desplegada para probarla.
 */
const APP_URL =
  (Constants.expoConfig?.extra?.appUrl) ||
  'http://localhost:3000';

export default function App() {
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Botón atrás de Android navega dentro de la WebView
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      if (webRef.current) { webRef.current.goBack(); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />
      <WebView
        ref={webRef}
        source={{ uri: APP_URL }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={['*']}
        domStorageEnabled
        javaScriptEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState
        style={styles.web}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  web: { flex: 1, backgroundColor: '#0b1220' },
  loader: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220',
  },
});
