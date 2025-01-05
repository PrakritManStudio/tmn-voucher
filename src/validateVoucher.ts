import { satangToBaht, bahtToSatang } from "./utils";
import type { Options, Voucher } from "./types";

// Utility function to validate voucher conditions
export function isValidVoucher(voucher: Voucher, options: Options): boolean {
  const { amount_baht, redeemed_amount_baht, available, type, member } =
    voucher;
  const amountInSatang = bahtToSatang(amount_baht);

  if (member === 1) {
    return satangToBaht(options.amount) === amount_baht;
  }

  if (member > 1 && type === "R") {
    const balance = amountInSatang - bahtToSatang(redeemed_amount_baht);
    return available === 1 && options.amount === balance;
  }

  if (member > 1 && type === "F") {
    const balance = amountInSatang / member;
    return options.amount === balance;
  }

  return false;
}
