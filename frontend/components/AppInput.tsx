import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/constants/theme";

export function AppInput({ label, error, secureTextEntry, inputRef, ...props }: TextInputProps & { label: string; error?: string; inputRef?: React.Ref<TextInput> }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <TextInput
          ref={inputRef}
          {...props}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          style={styles.input}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={isPassword ? "done" : "next"}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setShowPassword(value => !value)}
            style={styles.eyeButton}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "800", color: colors.ink, marginBottom: 7, letterSpacing: 0.2 },
  inputContainer: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.ink,
  },
  eyeButton: {
    width: 48,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  inputError: { borderColor: colors.danger },
  error: { marginTop: 5, color: colors.danger, fontSize: 12 },
});
