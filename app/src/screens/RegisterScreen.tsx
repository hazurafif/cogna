import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Lock, UserRound, ArrowRight } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { Icon } from "../components/ui/icon";
import { Input } from "../components/ui/input";
import { Link } from "../components/ui/link";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, spacing } from "../theme/tokens";

export function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutedColor = useColor("textMuted");
  const dangerColor = useColor("error");

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
        <Text variant="title" style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start your study streak today.</Text>
        <Input
          variant="outline"
          icon={UserRound}
          placeholder="Email"
          placeholderTextColor={mutedColor}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          testID="email-input"
        />
        <Input
          variant="outline"
          icon={Lock}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={mutedColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />
        {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
        <Button title="Register" onPress={onSubmit} loading={submitting} />
        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
          <Icon name={ArrowRight} size={14} strokeWidth={2.2} color={mutedColor} />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: spacing.md },
  title: {
    fontSize: 24,
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.body,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  error: { fontSize: fontSize.body },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  linkText: { fontSize: fontSize.body, fontFamily: appFonts.semibold },
});
