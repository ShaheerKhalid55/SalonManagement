import { api } from "@/lib/api";

export interface Wallet {
  id: number;
  user_id: number;
  balance: number | string;
  currency: string;
}

export interface WalletTransaction {
  id: number;
  transaction_reference: string;
  transaction_type: string;
  amount: number | string;
  balance_before: number | string;
  balance_after: number | string;
  status: string;
  description?: string | null;
  booking_id?: number | null;
  created_at: string;
}

export async function getWallet() {
  const { data } = await api.get<Wallet>("/wallet");
  return data;
}

export async function getWalletTransactions() {
  const { data } = await api.get<WalletTransaction[]>("/wallet/transactions");
  return data;
}

export async function topUpWallet(amount: number, description = "Wallet top-up") {
  const { data } = await api.post<WalletTransaction>("/wallet/top-up", {
    amount,
    description,
  });
  return data;
}
