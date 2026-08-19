import { api } from "@/lib/api";

export interface Referral {
  id: number;
  referrer_id: number;
  referred_user_id: number;
  referral_code: string;
  status: string;
  reward_amount: number | string;
  completed_at?: string | null;
  created_at: string;
}

export async function getMyReferralCode() {
  const { data } = await api.get<{ referral_code: string }>("/referrals/my-code");
  return data;
}

export async function getReferralHistory() {
  const { data } = await api.get<Referral[]>("/referrals/history");
  return data;
}

export async function applyReferralCode(referral_code: string) {
  const { data } = await api.post<Referral>("/referrals/apply", { referral_code });
  return data;
}
