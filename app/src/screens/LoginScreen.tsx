import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { BookOpen, Lock, Mail, Sparkles } from "lucide-react-native";
import { TextInput } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError("Could not log in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <BookOpen size={28} strokeWidth={2.2} color={colors.white} />
          </View>
          <Sparkles size={16} strokeWidth={2.2} color={colors.primary} style={styles.logoSparkle} />
        </View>
        <Text style={styles.title}>Cogna</Text>
        <Text style={styles.subtitle}>Track your study sessions, one hour at a time.</Text>
        <TextInput
          mode="outlined"
          placeholder="Email"
          placeholderTextColor={colors.authMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
          left={
            <TextInput.Icon
              icon={({ size, color }) => <Mail size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        <TextInput
          mode="outlined"
          placeholder="Password"
          placeholderTextColor={colors.authMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
          left={
            <TextInput.Icon
              icon={({ size, color }) => <Lock size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Log in" onPress={onSubmit} loading={submitting} />
        <Link href="/register" style={styles.link}>
          <Text style={styles.linkText}>No account?</Text>
          <Text style={styles.linkAccent}>Register{">"}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.authBg },
  center: { flex: 1, justifyContent: "center", gap: spacing.md },
  logoWrap: { alignItems: "center", marginBottom: spacing.sm },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  logoSparkle: {
    position: "absolute",
    top: -6,
    right: -10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.authMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
  link: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  linkText: { color: colors.text, fontSize: fontSize.body, fontWeight: "500" },
  linkAccent: { color: colors.primary, fontSize: fontSize.body, fontWeight: "700" },
});
