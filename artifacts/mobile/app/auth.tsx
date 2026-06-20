import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogin, useRegister, useResetPassword } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register" | "forgot";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { mutate: doLogin, isPending: loginPending } = useLogin();
  const { mutate: doRegister, isPending: registerPending } = useRegister();
  const { mutate: doReset, isPending: resetPending } = useResetPassword();

  const isPending = loginPending || registerPending || resetPending;

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setResetSuccess(false);
    setNewPassword("");
  }

  const handleSubmit = async () => {
    setError(null);
    setResetSuccess(false);

    if (mode === "forgot") {
      if (!email) { setError("Email is required"); return; }
      if (!newPassword || newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      doReset(
        { data: { email, newPassword } },
        {
          onSuccess: () => {
            setResetSuccess(true);
            setError(null);
          },
          onError: (err: any) => {
            setError(err?.data?.error ?? "No account found with this email address");
          },
        }
      );
      return;
    }

    if (!email || !password) { setError("Email and password are required"); return; }
    if (mode === "register" && !name) { setError("Name is required"); return; }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (mode === "login") {
      doLogin(
        { data: { email, password } },
        {
          onSuccess: async (data) => { await login(data.user, data.token); },
          onError: (err: any) => { setError(err?.data?.error ?? "Invalid email or password"); },
        }
      );
    } else {
      doRegister(
        { data: { email, password, name, phone: phone || undefined } },
        {
          onSuccess: async (data) => { await login(data.user, data.token); },
          onError: (err: any) => { setError(err?.data?.error ?? "Registration failed. Please try again."); },
        }
      );
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 32,
      paddingBottom: insets.bottom + 32,
      justifyContent: "center",
    },
    logoArea: { alignItems: "center", marginBottom: 36 },
    logoCircle: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", marginBottom: 16,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
    },
    appName: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, letterSpacing: 0.5 },
    appTagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 },
    card: {
      backgroundColor: colors.card, borderRadius: 24, padding: 24,
      borderWidth: 1, borderColor: colors.border,
    },
    toggleRow: {
      flexDirection: "row", backgroundColor: colors.secondary,
      borderRadius: 12, padding: 4, marginBottom: 24,
    },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
    toggleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    forgotHeader: { alignItems: "center", marginBottom: 20 },
    forgotTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    forgotSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", lineHeight: 19 },
    fieldLabel: {
      fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground,
      letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 14,
    },
    input: {
      backgroundColor: colors.secondary, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
      fontFamily: "Inter_400Regular", color: colors.foreground,
      borderWidth: 1, borderColor: colors.border,
    },
    errorBox: {
      backgroundColor: "rgba(232,0,58,0.1)", borderRadius: 10, padding: 12,
      marginTop: 16, borderWidth: 1, borderColor: "rgba(232,0,58,0.25)",
      flexDirection: "row", gap: 8, alignItems: "center",
    },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.primary, flex: 1 },
    successBox: {
      backgroundColor: "rgba(0,230,118,0.08)", borderRadius: 10, padding: 14,
      marginTop: 16, borderWidth: 1, borderColor: "rgba(0,230,118,0.25)",
      flexDirection: "row", gap: 8, alignItems: "center",
    },
    successText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#00e676", flex: 1 },
    submitBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
      alignItems: "center", marginTop: 24, flexDirection: "row",
      justifyContent: "center", gap: 8,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
    },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
    forgotLink: { alignItems: "center", marginTop: 14 },
    forgotLinkText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.primary },
    backLink: { alignItems: "center", marginTop: 16 },
    backLinkText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    disclaimer: {
      fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground,
      textAlign: "center", marginTop: 20, lineHeight: 18,
    },
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="shield-alert" size={40} color="#fff" />
          </View>
          <Text style={styles.appName}>EmergencyAlert</Text>
          <Text style={styles.appTagline}>Your safety, one tap away</Text>
        </View>

        <View style={styles.card}>
          {/* Mode Toggle — only for login/register */}
          {mode !== "forgot" && (
            <View style={styles.toggleRow}>
              {(["login", "register"] as const).map((m) => {
                const isActive = mode === m;
                return (
                  <Pressable
                    key={m}
                    style={[styles.toggleBtn, isActive && { backgroundColor: colors.primary }]}
                    onPress={() => switchMode(m)}
                  >
                    <Text style={[styles.toggleBtnText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                      {m === "login" ? "Sign In" : "Sign Up"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === "forgot" && (
            <>
              <View style={styles.forgotHeader}>
                <Text style={styles.forgotTitle}>Reset Password</Text>
                <Text style={styles.forgotSub}>
                  Enter your registered email and choose a new password.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />

              {error && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={colors.primary} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {resetSuccess && (
                <View style={styles.successBox}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#00e676" />
                  <Text style={styles.successText}>
                    Password reset successfully! You can now sign in with your new password.
                  </Text>
                </View>
              )}

              {!resetSuccess ? (
                <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={isPending}>
                  {isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Reset Password</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.submitBtn, { marginTop: 16 }]}
                  onPress={() => switchMode("login")}
                >
                  <Text style={styles.submitBtnText}>Back to Sign In</Text>
                </Pressable>
              )}

              <Pressable style={styles.backLink} onPress={() => switchMode("login")}>
                <Text style={styles.backLinkText}>← Back to Sign In</Text>
              </Pressable>
            </>
          )}

          {/* ── LOGIN / REGISTER FORM ── */}
          {mode !== "forgot" && (
            <>
              {mode === "register" && (
                <>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === "register" ? "Min 6 characters" : "Your password"}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />

              {mode === "login" && (
                <Pressable style={styles.forgotLink} onPress={() => switchMode("forgot")}>
                  <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                </Pressable>
              )}

              {mode === "register" && (
                <>
                  <Text style={styles.fieldLabel}>Phone (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={colors.primary} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          By continuing, you agree to use this app responsibly.{"\n"}
          Only trigger SOS in real emergencies.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
