import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { getReminders, Reminder } from "@/services/notifications";
import { getApiErrorMessage } from "@/lib/api";
import { AppText } from "@/components/Typography";

function dateText(v:string){return new Date(`${v}T12:00:00`).toLocaleDateString("en-PK",{weekday:"long",day:"numeric",month:"long"});}
function time(v:string){return v.slice(0,5);}

export default function RemindersScreen(){
 const [items,setItems]=useState<Reminder[]>([]);
 const [refreshing,setRefreshing]=useState(false);

 const load=useCallback(async()=>{
   try{setItems(await getReminders());}
   catch(e){Alert.alert("Reminders",getApiErrorMessage(e));}
   finally{setRefreshing(false);}
 },[]);
 useEffect(()=>{load();},[load]);

 return <Screen><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
  <AppText style={styles.title}>Reminders</AppText><AppText style={styles.subtitle}>Don't miss a good time for your next salon visit.</AppText>
  {items.length===0?<View style={styles.empty}><AppText style={styles.emptyTitle}>No reminders</AppText><AppText style={styles.text}>When the salon reminder service creates a reminder for you, it will appear here.</AppText></View>:
   items.map(r=><View key={r.id} style={styles.card}><AppText style={styles.badge}>SALON REMINDER</AppText><AppText style={styles.cardTitle}>Evening slot available</AppText><AppText style={styles.text}>{dateText(r.reminder_date)} at {time(r.reminder_time)}</AppText><AppText style={styles.text}>{r.is_sent?"Notification sent":"Reminder pending"}</AppText><AppButton title="View services" onPress={()=>router.push("/(tabs)/services")} style={{marginTop:12}}/></View>)}
 </ScrollView></Screen>;
}
const styles=StyleSheet.create({content:{paddingVertical:24,paddingBottom:40},title:{color:"#2B1837",fontSize:30,fontWeight:"800"},subtitle:{color:"#7D747D",fontSize:14,lineHeight:21,marginTop:5,marginBottom:22},empty:{backgroundColor:"#FFFFFF",borderRadius:18,padding:22,borderWidth:1,borderColor:"#E9E0D6"},emptyTitle:{fontWeight:"800",fontSize:17,color:"#2B1837"},text:{color:"#7D747D",fontSize:13,lineHeight:19,marginTop:5},card:{backgroundColor:"#2B1837",borderRadius:20,padding:20,marginBottom:12},badge:{alignSelf:"flex-start",backgroundColor:"#4A3158",color:"#E8DCC7",borderRadius:8,paddingHorizontal:8,paddingVertical:5,fontSize:9,fontWeight:"800",letterSpacing:1,overflow:"hidden"},cardTitle:{color:"#FFFFFF",fontSize:19,fontWeight:"800",marginTop:10}});
