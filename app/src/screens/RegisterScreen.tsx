import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Lock, UserRound, ArrowRight } from "lucide-react-native";
import { TextInput } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";

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
        <TextInput
          mode="outlined"
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
          left={
            <TextInput.Icon
              icon={({ size, color }) => <UserRound size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        <TextInput
          mode="outlined"
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.textMuted}
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
