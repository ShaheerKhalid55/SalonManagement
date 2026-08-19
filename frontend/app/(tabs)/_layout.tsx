import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export default function TabsLayout(){
 return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.plum,tabBarInactiveTintColor:"#A39A9F",tabBarStyle:{height:72,paddingTop:7,paddingBottom:9,backgroundColor:colors.white,borderTopColor:colors.border,borderTopWidth:1,elevation:12},tabBarLabelStyle:{fontSize:10,fontWeight:"700"}}}>
  <Tabs.Screen name="home" options={{title:"Home",tabBarIcon:({color,size})=><Ionicons name="home-outline" size={size} color={color}/>}}/>
  <Tabs.Screen name="appointments" options={{title:"Bookings",tabBarIcon:({color,size})=><Ionicons name="calendar-outline" size={size} color={color}/>}}/>
  <Tabs.Screen name="wallet" options={{title:"Wallet",tabBarIcon:({color,size})=><Ionicons name="wallet-outline" size={size} color={color}/>}}/>
  <Tabs.Screen name="services" options={{title:"Services",tabBarIcon:({color,size})=><Ionicons name="cut-outline" size={size} color={color}/>}}/>
  <Tabs.Screen name="profile" options={{title:"Account",tabBarIcon:({color,size})=><View style={{width:size,height:size,borderRadius:12,backgroundColor:colors.plum,alignItems:"center",justifyContent:"center",marginBottom:6}}><Text style={{color:colors.champagneLight,fontSize:16,fontWeight:"900"}}>S</Text></View>}}/>
  <Tabs.Screen name="referral" options={{href:null}}/><Tabs.Screen name="notifications" options={{href:null}}/><Tabs.Screen name="reminders" options={{href:null}}/>
 </Tabs>;
}
