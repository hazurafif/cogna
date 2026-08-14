import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { BookOpen, Lock, Mail, Sparkles } from "lucide-react-native";
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
import { fontSize, radius, spacing } from "../theme/tokens";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mutedColor = useColor("textMuted");
  const primaryColor = useColor("primary");
  const foregroundColor = useColor("primaryForeground");
  const dangerColor = useColor("error");

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
          <View style={[styles.logo, { backgroundColor: primaryColor }]}>
            <Icon name={BookOpen} size={28} strokeWidth={2.2} color={foregroundColor} />
          </View>
          <Sparkles size={16} strokeWidth={2.2} color={primaryColor} style={styles.logoSparkle} />
        </View>
        <Text variant="heading" style={styles.title}>Cogna</Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>Track your study sessions, one hour at a time.</Text>
        <Input
          variant="outline"
          icon={Mail}
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
          placeholder="Password"
          placeholderTextColor={mutedColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="password-input"
        />
        {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
        <Button title="Log in" onPress={onSubmit} loading={submitting} />
        <Link href="/register" style={styles.link}>
          <Text style={styles.linkText}>No account?</Text>
          <Text style={[styles.linkAccent, { color: primaryColor }]}>Register{">"}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center" },
  center: { gap: spacing.md },
  logoWrap: { alignItems: "center", marginBottom: spacing.sm },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSparkle: {
    position: "absolute",
    top: -6,
    right: -10,
  },
  title: {
    fontSize: 32,
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.8,
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
    alignSelf: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  linkText: { fontSize: fontSize.body, fontFamily: appFonts.medium },
  linkAccent: { fontSize: fontSize.body, fontFamily: appFonts.bold },
});
