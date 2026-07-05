import { resolveConfig } from "./config";
import { failure } from "./errors";
import { requestJson, parseTrueMoneyResponse } from "./transport";
import { bahtToSatang, buildUrl } from "./utils";
import {
  validateInput,
  validateOptions,
  validatePhoneNumber,
  validateVoucherCode,
} from "./validators";
import { matchesVoucherConditions } from "./voucherRules";
import type {
  ConfigurationData,
  RedeemVoucherOptions,
  RedeemVoucherResult,
  ResolvedTmnVoucherClientConfig,
  ServerStatusResult,
  TmnVoucherClientConfig,
  TrueMoneyResponse,
  ValidateInputParams,
  ValidateInputResult,
  VerifyVoucherOptions,
  VerifyVoucherResult,
  VoucherData,
} from "./types";

/**
 * Client สำหรับตรวจสอบและแลกคูปองอั่งเปา TrueMoney Wallet
 *
 * SDK นี้เป็น third-party ไม่ใช่ผลิตภัณฑ์อย่างเป็นทางการจาก TrueMoney
 * ทุก method คืนผลลัพธ์แบบ result object (`success: true | false`) ไม่ throw
 *
 * @example
 * ```typescript
 * const client = new TmnVoucherClient();
 *
 * const result = await client.redeemVoucher(
 *   "0812345678",
 *   "https://gift.truemoney.com/campaign/?v=YOUR_CODE",
 *   { amount: 10000 },
 * );
 *
 * if (result.success) {
 *   console.log(result.data.amount);
 * }
 * ```
 */
export class TmnVoucherClient {
  private readonly config: ResolvedTmnVoucherClientConfig;

  /**
   * @param config - ตั้งค่า base URL, fetch, timeout และ headers
   */
  constructor(config: TmnVoucherClientConfig = {}) {
    this.config = resolveConfig(config);
  }

  /**
   * ตรวจสอบ input โดยไม่เรียก API
   *
   * เหมาะสำหรับ validate form ก่อนเรียก {@link verifyVoucher} หรือ {@link redeemVoucher}
   *
   * @param input - เบอร์โทร, voucher URL/code และ options
   * @returns ผลลัพธ์ validation พร้อม `issues` ถ้าไม่ผ่าน
   */
  validateInput(input: ValidateInputParams): ValidateInputResult {
    return validateInput(input);
  }

  /**
   * ตรวจสอบว่า TrueMoney voucher server พร้อมใช้งานหรืออยู่ในช่วง maintenance
   *
   * คืน `MAINTENANCE` เมื่อ `status.code` เป็น `MAINTENANCE`
   * หรือ `data.ma` มีข้อความแจ้งปิดปรับปรุง
   *
   * @returns `SUCCESS` ถ้า server พร้อมใช้งาน
   */
  async checkServerStatus(): Promise<ServerStatusResult> {
    const response = await requestJson<TrueMoneyResponse<ConfigurationData>>(
      this.config,
      buildUrl(this.config.baseApiUrl, "/campaign/vouchers/configuration"),
    );

    if (!response.success) {
      return response;
    }

    const parsed = parseTrueMoneyResponse(response.data);

    if (!parsed.success) {
      return parsed;
    }

    const isMaintenance =
      parsed.code === "MAINTENANCE" || hasMaintenance(response.data.data?.ma);

    if (!isMaintenance) {
      return {
        success: true,
        code: "SUCCESS",
        message: parsed.message,
      };
    }

    return failure(
      "MAINTENANCE",
      extractMaintenanceMessage(response.data.data?.ma) ?? parsed.message,
    );
  }

  /**
   * ตรวจสอบข้อมูล voucher โดยไม่ redeem
   *
   * รองรับทั้ง voucher URL และ voucher code ตรง ๆ
   * ถ้าระบุ `options.amount` (หน่วยสตางค์) จะตรวจว่า voucher ตรงเงื่อนไขก่อนคืน `SUCCESS`
   *
   * @param voucherUrlOrCode - URL หรือรหัส voucher
   * @param options - เงื่อนไขเพิ่มเติม เช่น `amount` หน่วยสตางค์
   * @returns ข้อมูล voucher จาก API (type ตาม TrueMoney) หรือ error code
   */
  async verifyVoucher(
    voucherUrlOrCode: string,
    options?: VerifyVoucherOptions,
  ): Promise<VerifyVoucherResult> {
    const voucherValidation = validateVoucherCode(voucherUrlOrCode);
    if (!voucherValidation.success) {
      return voucherValidation;
    }

    const optionsValidation = validateOptions(options);
    if (!optionsValidation.success) {
      return optionsValidation;
    }

    const response = await requestJson<TrueMoneyResponse<VoucherData | null>>(
      this.config,
      buildUrl(
        this.config.baseApiUrl,
        `/campaign/vouchers/${voucherValidation.voucherCode}/verify`,
      ),
    );

    if (!response.success) {
      return response;
    }

    const parsed = parseTrueMoneyResponse(response.data);

    if (!parsed.success) {
      return parsed;
    }

    if (parsed.code !== "SUCCESS") {
      return failure(parsed.code, parsed.message, parsed.data);
    }

    if (!isVoucherData(parsed.data)) {
      return failure("INVALID_RESPONSE", "ไม่พบข้อมูล Voucher จาก API");
    }

    if (!matchesVoucherConditions(parsed.data.voucher, optionsValidation.options)) {
      return failure("CONDITION_NOT_MET", "ไม่ตรงเงื่อนไข", parsed.data);
    }

    return {
      success: true,
      code: "SUCCESS",
      message: parsed.message,
      data: {
        voucherCode: voucherValidation.voucherCode,
        voucher: parsed.data.voucher,
        ownerProfile: parsed.data.owner_profile,
        tickets: parsed.data.tickets ?? [],
        raw: parsed.data,
      },
    };
  }

  /**
   * แลกคูปองอั่งเปาเข้ากระเป๋า TrueMoney ของเบอร์ที่ระบุ
   *
   * Flow: validate input → {@link checkServerStatus} → (optional) {@link verifyVoucher} → redeem
   *
   * ถ้าระบุ `options.amount` แล้วไม่ตรงเงื่อนไข จะไม่เรียก redeem endpoint
   * และคืน `CONDITION_NOT_MET`
   *
   * @param phoneNumber - เบอร์โทรผู้รับ 10 หลัก ขึ้นต้นด้วย 0
   * @param voucherUrlOrCode - URL หรือรหัส voucher
   * @param options - เงื่อนไขเพิ่มเติม เช่น `amount` หน่วยสตางค์
   * @returns `data.amount` เป็นจำนวนเงินที่ได้รับ (สตางค์) และ `data.raw` จาก API
   */
  async redeemVoucher(
    phoneNumber: string,
    voucherUrlOrCode: string,
    options?: RedeemVoucherOptions,
  ): Promise<RedeemVoucherResult> {
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.success) {
      return phoneValidation;
    }

    const voucherValidation = validateVoucherCode(voucherUrlOrCode);
    if (!voucherValidation.success) {
      return voucherValidation;
    }

    const optionsValidation = validateOptions(options);
    if (!optionsValidation.success) {
      return optionsValidation;
    }

    const serverStatus = await this.checkServerStatus();
    if (!serverStatus.success) {
      return serverStatus;
    }

    if (optionsValidation.options.amount !== undefined) {
      const verifyResult = await this.verifyVoucher(
        voucherValidation.voucherCode,
        optionsValidation.options,
      );

      if (!verifyResult.success) {
        return verifyResult;
      }
    }

    const response = await requestJson<TrueMoneyResponse<VoucherData | null>>(
      this.config,
      buildUrl(
        this.config.baseApiUrl,
        `/campaign/vouchers/${voucherValidation.voucherCode}/redeem`,
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phoneValidation.phoneNumber,
          voucher_hash: voucherValidation.voucherCode,
        }),
      },
    );

    if (!response.success) {
      return response;
    }

    const parsed = parseTrueMoneyResponse(response.data);

    if (!parsed.success) {
      return parsed;
    }

    if (parsed.code !== "SUCCESS") {
      return failure(parsed.code, parsed.message, parsed.data);
    }

    if (!isVoucherData(parsed.data) || !parsed.data.my_ticket) {
      return failure("INVALID_RESPONSE", "ไม่พบข้อมูลการแลก Voucher จาก API");
    }

    return {
      success: true,
      code: "SUCCESS",
      message: parsed.message,
      data: {
        voucherCode: voucherValidation.voucherCode,
        amount: bahtToSatang(parsed.data.my_ticket.amount_baht),
        raw: parsed.data,
      },
    };
  }
}

/**
 * สร้าง {@link TmnVoucherClient} instance
 *
 * @param config - ตั้งค่า client เช่น `fetch`, `timeoutMs`, `baseApiUrl`
 */
export function createTmnVoucherClient(
  config?: TmnVoucherClientConfig,
): TmnVoucherClient {
  return new TmnVoucherClient(config);
}

function isVoucherData(data: unknown): data is VoucherData {
  if (!data || typeof data !== "object") {
    return false;
  }

  return "voucher" in data && "owner_profile" in data;
}

function hasMaintenance(ma: ConfigurationData["ma"]): boolean {
  if (!ma) {
    return false;
  }

  return [
    ma.title_th,
    ma.title_en,
    ma.message_th,
    ma.message_en,
  ].some((value) => !isEmptyMaintenanceValue(value));
}

function isEmptyMaintenanceValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function extractMaintenanceMessage(ma: ConfigurationData["ma"]): string | null {
  if (!ma) {
    return null;
  }

  for (const value of [ma.title_th, ma.message_th, ma.title_en, ma.message_en]) {
    if (!isEmptyMaintenanceValue(value)) {
      return String(value);
    }
  }

  return null;
}
