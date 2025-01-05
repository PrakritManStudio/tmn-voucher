import { BASE_URL } from "./constants";
import { checkMaintenance } from "./checkMaintenance";
import { validateInput } from "./validateInput";
import { satangToBaht, bahtToSatang } from "./utils";
import type { RedeemVoucherResponse, ReturnData, Options } from "./types";

export default async function redeemvouchers(
  phoneNumber: string,
  voucherUrl: string,
  options?: Options
): Promise<ReturnData> {
  const voucherCode = voucherUrl.replace(`${BASE_URL}/campaign/?v=`, "");

  const inputValidation = await validateInput(phoneNumber, voucherUrl);
  if (!inputValidation.success) {
    return {
      success: false,
      code: inputValidation.code,
      message: inputValidation.message,
    };
  }

  const maintenance = await checkMaintenance();
  if (!maintenance.success) {
    return {
      success: false,
      code: maintenance.code,
      message: maintenance.message,
    };
  }

  if (options) {
    const verifyResponse: RedeemVoucherResponse = await fetch(
      BASE_URL + "/campaign/vouchers/" + voucherCode + "/verify"
    ).then((response) => response.json());

    if (!verifyResponse.data || verifyResponse.status.code !== "SUCCESS") {
      return {
        success: false,
        code: verifyResponse.status.code,
        message: verifyResponse.status.message,
      };
    }

    if (
      verifyResponse.data.voucher.member > 1 &&
      verifyResponse.data.voucher.type === "R"
    ) {
      if (verifyResponse.data.voucher.available !== 1) {
        return {
          success: false,
          code: "CONDITION_NOT_MET",
          message: "[ไม่ตรงเงื่อนไข]",
        };
      }
      const balance =
        bahtToSatang(verifyResponse.data.voucher.amount_baht) -
        bahtToSatang(verifyResponse.data.voucher.redeemed_amount_baht);

      if (options.amount !== balance) {
        return {
          success: false,
          code: "CONDITION_NOT_MET",
          message: "[ไม่ตรงเงื่อนไข]",
        };
      }
    }

    if (
      verifyResponse.data.voucher.member > 1 &&
      verifyResponse.data.voucher.type === "F"
    ) {
      const balance =
        bahtToSatang(verifyResponse.data.voucher.amount_baht) /
        verifyResponse.data.voucher.member;

      if (options.amount !== balance) {
        return {
          success: false,
          code: "CONDITION_NOT_MET",
          message: "[ไม่ตรงเงื่อนไข]",
        };
      }
    }

    const req_amount_baht = satangToBaht(options.amount);
    if (verifyResponse.data.voucher.amount_baht !== req_amount_baht) {
      return {
        success: false,
        code: "CONDITION_NOT_MET",
        message: "[ไม่ตรงเงื่อนไข]",
      };
    }
  }

  const redeemResponse: RedeemVoucherResponse = await fetch(
    BASE_URL + "/campaign/vouchers/" + voucherCode + "/redeem",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: phoneNumber,
        voucher_hash: voucherCode,
      }),
    }
  ).then((response) => response.json());

  if (redeemResponse.status.code === "SUCCESS") {
    return {
      success: true,
      code: redeemResponse.status.code,
      message: redeemResponse.status.message,
      data: redeemResponse.data!,
    };
  }
  return {
    success: false,
    code: redeemResponse.status.code,
    message: redeemResponse.status.message,
    data: redeemResponse.data,
  };
}
