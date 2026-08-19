import React from "react";
import {StyleSheet,Text,TextInput,TextInputProps,View} from "react-native";
import { colors, radius } from "@/constants/theme";

export function AppInput({label,error,...props}:TextInputProps&{label:string;error?:string}) {
  return <View style={styles.wrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput {...props} style={[styles.input,error&&styles.inputError]} placeholderTextColor={colors.muted} autoCapitalize="none" />
    {error?<Text style={styles.error}>{error}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
 wrapper:{marginBottom:16},label:{fontSize:12,fontWeight:"800",color:colors.ink,marginBottom:7,letterSpacing:.2},
 input:{height:52,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.white,paddingHorizontal:15,fontSize:16,color:colors.ink},
 inputError:{borderColor:colors.danger},error:{marginTop:5,color:colors.danger,fontSize:12}
});
