import { bahtToSatang } from "./utils";
import type { VerifyVoucherOptions, Voucher } from "./types";

export function matchesVoucherConditions(
  voucher: Voucher,
  options: VerifyVoucherOptions,
): boolean {
  if (options.amount === undefined) {
    return true;
  }

  const amountInSatang = bahtToSatang(voucher.amount_baht);

  if (voucher.member === 1) {
    return options.amount === amountInSatang;
  }

  if (voucher.member > 1 && voucher.type === "R") {
    const balance =
      amountInSatang - bahtToSatang(voucher.redeemed_amount_baht);
    return voucher.available === 1 && options.amount === balance;
  }

  if (voucher.member > 1 && voucher.type === "F") {
    const balance = amountInSatang / voucher.member;
    return options.amount === balance;
  }

  return false;
}
