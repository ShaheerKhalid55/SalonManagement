import React from "react";
import {ActivityIndicator,Pressable,StyleSheet,Text,ViewStyle} from "react-native";
import { colors, radius } from "@/constants/theme";

export function AppButton({title,onPress,loading=false,disabled=false,variant="primary",style}: {
  title:string; onPress:()=>void; loading?:boolean; disabled?:boolean;
  variant?:"primary"|"secondary"|"ghost"; style?:ViewStyle;
}) {
  return <Pressable onPress={onPress} disabled={disabled||loading}
    style={({pressed})=>[styles.button,variant==="secondary"?styles.secondary:variant==="ghost"?styles.ghost:styles.primary,(disabled||loading)&&styles.disabled,pressed&&styles.pressed,style]}>
    {loading?<ActivityIndicator color={variant==="primary"?colors.white:colors.plum}/>:<Text style={[styles.text,variant!=="primary"&&styles.secondaryText]}>{title}</Text>}
  </Pressable>;
}
const styles=StyleSheet.create({
 button:{minHeight:50,borderRadius:radius.md,alignItems:"center",justifyContent:"center",paddingHorizontal:18},
 primary:{backgroundColor:colors.plum},secondary:{backgroundColor:colors.champagneLight},ghost:{backgroundColor:"transparent",borderWidth:1,borderColor:colors.border},
 disabled:{opacity:.5},pressed:{transform:[{scale:.985}],opacity:.9},text:{color:colors.white,fontSize:15,fontWeight:"800"},secondaryText:{color:colors.plum}
});
