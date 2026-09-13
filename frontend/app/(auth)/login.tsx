import React, { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, TextInput } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api";
import { colors } from "@/constants/theme";
import { AppText } from "@/components/Typography";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert("Missing information", "Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await signIn({ email: email.trim().toLowerCase(), password });
      router.replace("/(tabs)/home");
    } catch (e) {
      Alert.alert("Login failed", getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <View style={styles.brand}>
            <View style={styles.logo}><Ionicons name="sparkles" size={24} color={colors.champagne} /></View>
            <AppText style={styles.brandName}>Salon.</AppText>
            <AppText style={styles.brandTag}>BEAUTY & YOU</AppText>
          </View>

          <AppText style={styles.title}>Welcome back 👋</AppText>
          <AppText style={styles.subtitle}>Log in to continue your beauty journey.</AppText>

          <AppInput
            label="Email or phone"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              inputRef={passwordRef}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              onSubmitEditing={submit}
            />

          <AppText style={styles.forgot}>Forgot password?</AppText>
          <AppButton title="Login" onPress={submit} loading={loading} />

          <View style={styles.or}>
            <View style={styles.line} /><AppText style={styles.orText}>Or continue with</AppText><View style={styles.line} />
          </View>

          <View style={styles.socials}>
            {["logo-google", "logo-facebook", "logo-apple"].map(i => (
              <View key={i} style={styles.social}><Ionicons name={i as any} size={19} color={colors.ink} /></View>
            ))}
          </View>

          <View style={styles.footer}>
            <AppText style={styles.footerText}>Don't have an account? </AppText>
            <Link href="/(auth)/register" style={styles.link}>Sign up</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: 30, paddingBottom: 50 },
  brand: { alignItems: "center", marginBottom: 28 },
  logo: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 30, color: colors.plum, marginTop: 9 },
  brandTag: { fontSize: 8, fontWeight: "900", letterSpacing: 2, color: colors.champagne, marginTop: 2 },
  title: { color: colors.ink, fontSize: 29, fontWeight: "900", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 5, marginBottom: 26 },
  forgot: { alignSelf: "flex-end", color: colors.champagne, fontSize: 11, fontWeight: "800", marginTop: -7, marginBottom: 17 },
  or: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  orText: { color: colors.muted, fontSize: 10, marginHorizontal: 10 },
  socials: { flexDirection: "row", justifyContent: "center", gap: 12 },
  social: { width: 50, height: 44, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 25 },
  footerText: { color: colors.muted, fontSize: 12 },
  link: { color: colors.plum, fontWeight: "900", fontSize: 12 },
});
