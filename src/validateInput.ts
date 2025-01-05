import z from "zod";
import { BASE_URL } from "./constants";
import type { ValidateInputResponse, Options } from "./types";

const inputSchema = z.object({
  phoneNumber: z
    .string()
    .length(10, "หมายเลขโทรศัพท์ต้องมี 10 หลัก")
    .refine((x) => /^\d+$/.test(x), "หมายเลขโทรศัพท์ต้องเป็นตัวเลข")
    .refine((x) => x.startsWith("0"), "หมายเลขโทรศัพท์ต้องขึ้นต้นด้วย 0"),
  voucherUrl: z
    .string()
    .refine(
      (x) => x.startsWith(BASE_URL + "/campaign/?v="),
      "รูปแบบ URL ไม่ถูกต้อง"
    )
    .refine(
      (x) => /^.*\/campaign\/\?v=[A-Za-z0-9]+$/.test(x),
      "รูปแบบ URL ไม่ถูกต้อง"
    ),
});

const optionsSchema = z.object({
  amount: z
    .number()
    .int("amount: ต้องเป็นจำนวนเต็ม")
    .positive()
    .min(100, "amount: จำนวนเงินขั้นต่ำ 1 บาท")
    .max(20000000, "amount: จำนวนเงินต้องไม่เกิน 200,000 บาท"),
});

export async function validateInput(
  phoneNumber: string,
  voucherUrl: string,
  options?: Options
): Promise<ValidateInputResponse> {
  const validationResult = inputSchema.safeParse({ phoneNumber, voucherUrl });
  if (!validationResult.success) {
    return {
      success: false,
      code: "INVALID_INPUT",
      message: validationResult.error.errors[0].message,
    };
  }

  if (options) {
    const optionsValidationResult = optionsSchema.safeParse(options);
    if (!optionsValidationResult.success) {
      optionsValidationResult.error.errors.map((error) => {
        console.log(error.message);
      });
      return {
        success: false,
        code: "INVALID_INPUT",
        message: optionsValidationResult.error.errors[0].message,
      };
    }
  }

  return {
    success: true,
    code: "SUCCESS",
  };
}
