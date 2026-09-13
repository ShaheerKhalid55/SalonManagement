import React from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  StyleProp,
  TextStyle,
} from "react-native";

const fontByWeight: Record<string, string> = {
  "100": "Ubuntu_400Regular",
  "200": "Ubuntu_400Regular",
  "300": "Ubuntu_400Regular",
  "400": "Ubuntu_400Regular",
  "500": "Ubuntu_500Medium",
  "600": "Ubuntu_500Medium",
  "700": "Ubuntu_700Bold",
  "800": "Ubuntu_700Bold",
  "900": "Ubuntu_700Bold",
  normal: "Ubuntu_400Regular",
  bold: "Ubuntu_700Bold",
};

function resolveFontFamily(style?: StyleProp<TextStyle>) {
  const flat = style ? (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map((item) => item && typeof item === "object" ? item : {})) : style) : undefined;
  const explicit = flat && typeof flat === "object" ? flat.fontFamily : undefined;
  if (explicit && explicit !== "Georgia") return explicit;
  const weight = flat && typeof flat === "object" ? flat.fontWeight : undefined;
  return fontByWeight[String(weight ?? "400")] ?? "Ubuntu_400Regular";
}

export const AppText = React.forwardRef<RNText, TextProps>(function AppText({ style, ...props }, ref) {
  return <RNText ref={ref} {...props} style={[{ fontFamily: resolveFontFamily(style) }, style]} />;
});

export const AppTextInput = React.forwardRef<RNTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={[{ fontFamily: resolveFontFamily(style) }, style]} />;
});
