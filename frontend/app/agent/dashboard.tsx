import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/context/AuthContext";
import { AgentDashboard, AgentAppointment, getAgentDashboard, getAgentStats } from "@/services/agent";
import { getApiErrorMessage } from "@/lib/api";

const money=(v:unknown)=>`PKR ${Number(v??0).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
const today=()=>new Date().toISOString().slice(0,10);
const thirtyDaysAgo=()=>{
 const d=new Date(); d.setDate(d.getDate()-29); return d.toISOString().slice(0,10);
};
const dateText=(v:string)=>new Date(`${v}T12:00:00`).toLocaleDateString("en-PK",{weekday:"short",day:"numeric",month:"short"});
const time=(v:string)=>v.slice(0,5);

export default function AgentDashboardScreen(){
 const {user,signOut}=useAuth();
 const [data,setData]=useState<AgentDashboard|null>(null);
 const [stats,setStats]=useState<{customers_served:number;completed_services:number;revenue:number|string}|null>(null);
 const [refreshing,setRefreshing]=useState(false);

 const load=useCallback(async()=>{
   try{
     const [d,s]=await Promise.all([
       getAgentDashboard(today()),
       getAgentStats(thirtyDaysAgo(),today())
     ]);
     setData(d); setStats(s);
   }catch(e){Alert.alert("Agent dashboard",getApiErrorMessage(e));}
   finally{setRefreshing(false);}
 },[]);

 useEffect(()=>{load();},[load]);

 async function logout(){await signOut();router.replace("/(auth)/login");}

 const summary=data?.summary;
 return <Screen><ScrollView contentContainerStyle={styles.content}
   refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
   <View style={styles.header}>
     <View style={{flex:1}}>
       <Text style={styles.eyebrow}>SALON AGENT</Text>
       <Text style={styles.title}>Hello, {user?.name?.split(" ")[0]||"Agent"}</Text>
       <Text style={styles.subtitle}>Today's service desk at a glance.</Text>
     </View>
     <AppButton title="Sign out" variant="secondary" onPress={logout} style={styles.logout}/>
   </View>

   <View style={styles.hero}>
     <Text style={styles.heroLabel}>TODAY</Text>
     <Text style={styles.heroValue}>{summary?.today_customers_served??0}</Text>
     <Text style={styles.heroText}>customers served</Text>
     <View style={styles.heroRow}>
       <Metric label="Completed" value={summary?.today_completed_services??0}/>
       <Metric label="Revenue" value={money(summary?.today_revenue??0)}/>
       <Metric label="Upcoming" value={summary?.upcoming_appointments??0}/>
     </View>
   </View>

   <Text style={styles.section}>Today's appointments</Text>
   {data?.today_appointments.length ? data.today_appointments.map(a=><AppointmentCard key={a.booking_id} appointment={a}/>) :
     <Empty text="No active appointments assigned to you today."/>}

   <Text style={styles.section}>Next 7 days</Text>
   {data?.upcoming_appointments.length ? data.upcoming_appointments.map(a=><AppointmentCard key={`u-${a.booking_id}`} appointment={a} showDate/>) :
     <Empty text="No upcoming appointments."/>}

   <Text style={styles.section}>Last 30 days</Text>
   <View style={styles.statsCard}>
     <Metric label="Customers served" value={stats?.customers_served??0}/>
     <Metric label="Completed services" value={stats?.completed_services??0}/>
     <Metric label="Revenue" value={money(stats?.revenue??0)}/>
   </View>
 </ScrollView></Screen>;
}

function AppointmentCard({appointment:a,showDate=false}:{appointment:AgentAppointment;showDate?:boolean}){
 return <View style={styles.card}>
   <View style={styles.cardTop}>
     <Text style={styles.booking}>{a.booking_number}</Text>
     <View style={styles.status}><Text style={styles.statusText}>{a.status.replace("_"," ")}</Text></View>
   </View>
   <Text style={styles.customer}>{a.customer_name}</Text>
   {showDate&&<Text style={styles.meta}>{dateText(a.booking_date)}</Text>}
   <Text style={styles.meta}>{time(a.start_time)} - {time(a.end_time)}</Text>
   <Text style={styles.services}>{a.service_summary||"Salon service"}</Text>
   <View style={styles.cardBottom}><Text style={styles.total}>{money(a.total)}</Text><AppButton title="Open" variant="secondary" onPress={()=>router.push({pathname:"/agent/booking/[id]",params:{id:String(a.booking_id)}})} style={styles.open}/></View>
 </View>;
}
function Metric({label,value}:{label:string;value:string|number}){return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;}
function Empty({text}:{text:string}){return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;}

const styles=StyleSheet.create({
 content:{paddingVertical:24,paddingBottom:40},header:{flexDirection:"row",alignItems:"center",marginBottom:18},eyebrow:{color:"#9A8F98",fontSize:10,fontWeight:"800",letterSpacing:1.2},title:{color:"#2B1837",fontSize:28,fontWeight:"800",marginTop:4},subtitle:{color:"#7D747D",fontSize:13,marginTop:4},logout:{minHeight:38,marginLeft:10},
 hero:{backgroundColor:"#2B1837",borderRadius:22,padding:20,marginBottom:24},heroLabel:{color:"#D8CADC",fontSize:10,fontWeight:"800",letterSpacing:1},heroValue:{color:"#FFFFFF",fontSize:38,fontWeight:"800",marginTop:5},heroText:{color:"#D8CADC",fontSize:13},heroRow:{flexDirection:"row",marginTop:18,gap:8},
 metric:{flex:1,backgroundColor:"#FFFFFF1",borderRadius:13,padding:10},metricValue:{color:"#FFFFFF",fontSize:16,fontWeight:"800"},metricLabel:{color:"#D8CADC",fontSize:10,marginTop:3},
 section:{color:"#2B1837",fontSize:19,fontWeight:"800",marginBottom:10,marginTop:2},card:{backgroundColor:"#FFFFFF",borderRadius:19,padding:17,marginBottom:10,borderWidth:1,borderColor:"#E9E0D6"},cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},booking:{color:"#9A8F98",fontSize:10,fontWeight:"800",letterSpacing:.7},status:{backgroundColor:"#E7F4EC",borderRadius:8,paddingHorizontal:8,paddingVertical:4},statusText:{color:"#287A55",fontSize:9,fontWeight:"800"},customer:{color:"#2B1837",fontSize:18,fontWeight:"800",marginTop:11},meta:{color:"#7D747D",fontSize:12,marginTop:3},services:{color:"#4F4B45",fontSize:13,marginTop:9},cardBottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:13,borderTopWidth:1,borderTopColor:"#E9E0D6",paddingTop:12},total:{color:"#2B1837",fontWeight:"800",fontSize:15},open:{minHeight:38},empty:{backgroundColor:"#FFFFFF",borderRadius:17,padding:18,borderWidth:1,borderColor:"#E9E0D6",marginBottom:22},emptyText:{color:"#7D747D",fontSize:13,lineHeight:19},statsCard:{backgroundColor:"#FFFFFF",borderRadius:19,padding:16,borderWidth:1,borderColor:"#E9E0D6",flexDirection:"row",gap:8}}
);
