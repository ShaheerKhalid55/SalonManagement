import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { Booking, completeAgentBooking, getAgentBooking, startAgentBooking } from "@/services/agent";
import { getApiErrorMessage } from "@/lib/api";

const money=(v:unknown)=>`PKR ${Number(v??0).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const time=(v:string)=>v.slice(0,5);
const dateText=(v:string)=>new Date(`${v}T12:00:00`).toLocaleDateString("en-PK",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

export default function AgentBookingDetails(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [booking,setBooking]=useState<Booking|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
   try{setBooking(await getAgentBooking(Number(id)));}
   catch(e){Alert.alert("Appointment",getApiErrorMessage(e));}
   finally{setLoading(false);}
 },[id]);
 useEffect(()=>{load();},[load]);

 async function start(){
  try{setBusy(true);setBooking(await startAgentBooking(Number(id)));Alert.alert("Service started","This appointment is now in progress.");}
  catch(e){Alert.alert("Unable to start",getApiErrorMessage(e));}
  finally{setBusy(false);}
 }
 async function complete(){
  try{setBusy(true);setBooking(await completeAgentBooking(Number(id)));Alert.alert("Service completed","The appointment has been marked completed.");}
  catch(e){Alert.alert("Unable to complete",getApiErrorMessage(e));}
  finally{setBusy(false);}
 }

 if(loading)return <Screen><Text style={styles.hint}>Loading appointment...</Text></Screen>;
 if(!booking)return <Screen><Text style={styles.hint}>Appointment not found.</Text></Screen>;

 return <Screen><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>Customer appointment</Text>
  <View style={styles.hero}><Text style={styles.booking}>{booking.booking_number}</Text><Text style={styles.customer}>Customer #{booking.customer_id}</Text><Text style={styles.date}>{dateText(booking.booking_date)}</Text><Text style={styles.time}>{time(booking.start_time)} - {time(booking.end_time)}</Text><Text style={styles.status}>{booking.status.replace("_"," ")}</Text></View>

  <Text style={styles.section}>Services</Text>
  <View style={styles.card}>{booking.items.map(i=><View key={i.id} style={styles.item}><Text style={styles.name}>{i.name}</Text><Text style={styles.price}>{money(i.total_price)}</Text></View>)}</View>

  <View style={styles.card}><Line label="Total" value={money(booking.total)} bold/><Line label="Payment" value={`${booking.payment_method} · ${booking.payment_status}`}/></View>

  {booking.status==="CONFIRMED"&&<AppButton title={busy?"Starting...":"Start service"} onPress={start} disabled={busy} style={styles.action}/>}
  {booking.status==="IN_PROGRESS"&&<AppButton title={busy?"Completing...":"Complete service"} onPress={complete} disabled={busy} style={styles.action}/>}
  {booking.status==="COMPLETED"&&<View style={styles.completed}><Text style={styles.completedTitle}>Service completed</Text><Text style={styles.hint}>This visit has been included in your performance statistics.</Text></View>}
  <AppButton title="Back to dashboard" variant="secondary" onPress={()=>router.replace("/agent/dashboard")}/>
 </ScrollView></Screen>;
}
function Line({label,value,bold=false}:{label:string;value:string;bold?:boolean}){return <View style={styles.line}><Text style={[styles.lineLabel,bold&&styles.bold]}>{label}</Text><Text style={[styles.lineValue,bold&&styles.bold]}>{value}</Text></View>;}
const styles=StyleSheet.create({content:{paddingVertical:24,paddingBottom:40},title:{color:"#2B1837",fontSize:30,fontWeight:"800",marginBottom:18},hero:{backgroundColor:"#2B1837",borderRadius:22,padding:22},booking:{color:"#D8CADC",fontSize:10,fontWeight:"800",letterSpacing:.8},customer:{color:"#FFFFFF",fontSize:22,fontWeight:"800",marginTop:10},date:{color:"#FFFFFF",fontSize:16,fontWeight:"700",marginTop:15},time:{color:"#D8CADC",marginTop:4},status:{color:"#E8DCC7",fontSize:11,fontWeight:"800",marginTop:12},section:{color:"#2B1837",fontSize:19,fontWeight:"800",marginTop:24,marginBottom:11},card:{backgroundColor:"#FFFFFF",borderRadius:18,padding:18,borderWidth:1,borderColor:"#E9E0D6",marginBottom:12},item:{flexDirection:"row",justifyContent:"space-between",paddingVertical:7},name:{color:"#2B1837",fontWeight:"700"},price:{color:"#2B1837",fontWeight:"800"},line:{flexDirection:"row",justifyContent:"space-between",paddingVertical:6},lineLabel:{color:"#7D747D"},lineValue:{color:"#4F4B45"},bold:{color:"#2B1837",fontWeight:"800"},action:{marginBottom:10},completed:{backgroundColor:"#E7F4EC",borderRadius:17,padding:18,marginBottom:12},completedTitle:{color:"#287A55",fontSize:16,fontWeight:"800",marginBottom:4},hint:{color:"#7D747D",fontSize:13,lineHeight:19}});
