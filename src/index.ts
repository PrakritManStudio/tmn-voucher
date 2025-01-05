import { BASE_URL } from "./constants";
import { checkMaintenance } from "./checkMaintenance";
import { validateInput } from "./validateInput";
import { bahtToSatang } from "./utils";
import { isValidVoucher } from "./validateVoucher";
import type {
  RedeemVoucherResponse,
  ReturnData,
  Options,
  StatusCode,
} from "./types";

export default async function redeemvouchers(
  phoneNumber: string,
  voucherUrl: string,
  options?: Options
): Promise<ReturnData> {
  const voucherCode = voucherUrl.replace(`${BASE_URL}/campaign/?v=`, "");

  // Validate input
  const inputValidation = await validateInput(phoneNumber, voucherUrl, options);
  if (!inputValidation.success) {
    return inputValidation;
  }

  // Check maintenance
  const maintenance = await checkMaintenance();
  if (!maintenance.success) {
    return maintenance;
  }

  if (options) {
    const verifyResponse: RedeemVoucherResponse = await fetch(
      BASE_URL + "/campaign/vouchers/" + voucherCode + "/verify"
    ).then((response) => response.json());

    if (!verifyResponse.data || verifyResponse.status.code !== "SUCCESS") {
      return {
        success: false,
        code: verifyResponse.status.code as Exclude<StatusCode, "SUCCESS">,
        message: verifyResponse.status.message,
      };
    }

    const { voucher } = verifyResponse.data;

    // Validate voucher conditions
    if (!isValidVoucher(voucher, options)) {
      return {
        success: false,
        code: "CONDITION_NOT_MET",
        message: "ไม่ตรงเงื่อนไข",
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
    const successResponse = redeemResponse as Extract<
      RedeemVoucherResponse,
      { status: { code: "SUCCESS" } }
    >;
    return {
      success: true,
      code: "SUCCESS",
      message: redeemResponse.status.message,
      amount: bahtToSatang(successResponse.data.my_ticket.amount_baht),
      data: successResponse.data,
    };
  }

  return {
    success: false,
    code: redeemResponse.status.code,
    message: redeemResponse.status.message,
    data: redeemResponse.data,
  };
}
