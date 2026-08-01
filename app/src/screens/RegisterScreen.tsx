import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { Lock, UserRound, ArrowRight } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      setError("Could not register. The email may already be in use.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start your study streak today.</Text>
        <View style={styles.inputWrap}>
          <UserRound size={16} strokeWidth={2.2} color={colors.textMuted} />
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
            placeholder="Password (min 8 characters)"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Register" onPress={onSubmit} loading={submitting} />
        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
          <ArrowRight size={14} strokeWidth={2.2} color={colors.textSecondary} />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
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
