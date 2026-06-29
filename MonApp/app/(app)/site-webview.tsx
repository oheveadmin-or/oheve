import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { C } from '@/constants/OheveTheme';
import { API_ENDPOINTS } from '@/constants/config';

const WEB_BUILDER_BASE = 'https://oheve.pages.dev/wedding';

export default function SiteWebViewScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    async function resolveUrl() {
      const token = user?.accessToken;
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

      if (!token) {
        setUri(`${WEB_BUILDER_BASE}/build`);
        return;
      }

      try {
        const res = await fetch(`${API_ENDPOINTS.weddingSites}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json() as { data?: { slug: string }[] };
          const slug = json.data?.[0]?.slug;
          if (slug) {
            setUri(`${WEB_BUILDER_BASE}/${slug}/build${tokenParam}`);
            return;
          }
        }
      } catch { /* fallback to new site */ }

      setUri(`${WEB_BUILDER_BASE}/build${tokenParam}`);
    }

    resolveUrl();
  }, [user?.accessToken]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          onPress={() => {
            if (canGoBack) webViewRef.current?.goBack();
            else router.back();
          }}
        >
          <Ionicons name="arrow-back" size={22} color={C.saugeDark} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Site Mariage</ThemedText>
        <Pressable hitSlop={12} onPress={() => webViewRef.current?.reload()}>
          <Ionicons name="refresh-outline" size={20} color={C.textLight} />
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.sauge} />
        </View>
      )}

      {uri && <WebView
        ref={webViewRef}
        source={{ uri }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.saugePale,
    backgroundColor: C.card,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: C.background,
  },
  webview: { flex: 1 },
});
