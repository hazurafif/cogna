import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { Mail, Lock, BookOpen, Sparkles, ArrowRight } from "lucide-react-native";
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
    <Screen>
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <BookOpen size={28} strokeWidth={2.2} color={colors.white} />
          </View>
          <Sparkles size={16} strokeWidth={2.2} color={colors.primary} style={styles.logoSparkle} />
        </View>
        <Text style={styles.title}>Cogna</Text>
        <Text style={styles.subtitle}>Track your study sessions, one hour at a time.</Text>
        <View style={styles.inputWrap}>
          <Mail size={16} strokeWidth={2.2} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="email-input"
          />
        </View>
        <View style={styles.inputWrap}>
          <Lock size={16} strokeWidth={2.2} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Log in" onPress={onSubmit} loading={submitting} />
        <Link href="/register" style={styles.link}>
          <Text style={styles.linkText}>No account? Register</Text>
          <ArrowRight size={14} strokeWidth={2.2} color={colors.textSecondary} />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  logoSparkle: { position: "absolute", top: 2, right: "38%" },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  linkText: { color: colors.textSecondary, fontSize: fontSize.body, fontWeight: "600" },
});
