import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { AppButton } from "@/components/AppButton";
import { getMyReferralCode, getReferralHistory, Referral } from "@/services/referral";
import { getApiErrorMessage } from "@/lib/api";
import { AppText } from "@/components/Typography";

const money=(v:unknown)=>`PKR ${Number(v??0).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;

export default function ReferralScreen(){
 const [code,setCode]=useState("");
 const [history,setHistory]=useState<Referral[]>([]);
 const [refreshing,setRefreshing]=useState(false);

 const load=useCallback(async()=>{
   try{const [c,h]=await Promise.all([getMyReferralCode(),getReferralHistory()]);setCode(c.referral_code);setHistory(h);}
   catch(e){Alert.alert("Referral",getApiErrorMessage(e));}
   finally{setRefreshing(false);}
 },[]);
 useEffect(()=>{load();},[load]);

 const earned=history.reduce((sum,x)=>sum+Number(x.reward_amount||0),0);

 async function share(){
   if(!code)return;
   await Share.share({message:`Join me at our salon. Use my referral code ${code} when you register.`});
 }

 return <Screen><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
  <AppText style={styles.title}>Referral</AppText><AppText style={styles.subtitle}>Refer friends and earn wallet credit when their referral becomes eligible.</AppText>
  <View style={styles.card}><AppText style={styles.label}>YOUR REFERRAL CODE</AppText><AppText style={styles.code}>{code||"Loading..."}</AppText><AppButton title="Share referral" onPress={share} style={styles.button}/></View>
  <View style={styles.stats}><View style={styles.stat}><AppText style={styles.value}>{history.length}</AppText><AppText style={styles.labelDark}>Referrals</AppText></View><View style={styles.stat}><AppText style={styles.value}>{money(earned)}</AppText><AppText style={styles.labelDark}>Rewards</AppText></View></View>
  <AppText style={styles.section}>Referral history</AppText>
  {history.length===0?<View style={styles.empty}><AppText style={styles.emptyTitle}>No referrals yet</AppText><AppText style={styles.text}>Share your code to get started.</AppText></View>:
   history.map(x=><View key={x.id} style={styles.item}><View style={{flex:1}}><AppText style={styles.itemTitle}>{x.referral_code}</AppText><AppText style={styles.text}>{x.status}</AppText></View><AppText style={styles.reward}>{money(x.reward_amount)}</AppText></View>)}
 </ScrollView></Screen>;
}
const styles=StyleSheet.create({content:{paddingVertical:24,paddingBottom:40},title:{color:"#2B1837",fontSize:30,fontWeight:"800"},subtitle:{color:"#7D747D",fontSize:14,lineHeight:21,marginTop:5,marginBottom:24},card:{backgroundColor:"#2B1837",borderRadius:22,padding:22},label:{color:"#D8CADC",fontSize:11,fontWeight:"800",letterSpacing:1},code:{color:"#FFFFFF",fontSize:25,fontWeight:"800",marginVertical:10},button:{backgroundColor:"#FFFFFF"},stats:{flexDirection:"row",gap:10,marginTop:18},stat:{flex:1,backgroundColor:"#FFFFFF",borderRadius:18,padding:18,borderWidth:1,borderColor:"#E9E0D6"},value:{color:"#2B1837",fontSize:21,fontWeight:"800"},labelDark:{color:"#7D747D",fontSize:12,marginTop:4},section:{color:"#2B1837",fontSize:19,fontWeight:"800",marginTop:28,marginBottom:12},empty:{backgroundColor:"#FFFFFF",borderRadius:18,padding:22,borderWidth:1,borderColor:"#E9E0D6"},emptyTitle:{color:"#2B1837",fontWeight:"800",fontSize:16},text:{color:"#7D747D",marginTop:4,lineHeight:19},item:{backgroundColor:"#FFFFFF",borderRadius:16,padding:16,marginBottom:8,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#E9E0D6"},itemTitle:{fontWeight:"800",color:"#2B1837"},reward:{fontWeight:"800",color:"#287A55"}});
