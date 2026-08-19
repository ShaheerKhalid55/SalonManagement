import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export function Screen({children}:{children:React.ReactNode}){
 return <SafeAreaView style={styles.safe} edges={["top","left","right"]}><View style={styles.container}>{children}</View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.ivory},container:{flex:1,paddingHorizontal:20}});
