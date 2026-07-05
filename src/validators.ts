import z from "zod";
import { failure } from "./errors";
import type {
  RedeemVoucherOptions,
  ValidateInputParams,
  ValidateInputResult,
  ValidationIssue,
  VerifyVoucherOptions,
} from "./types";

const phoneNumberSchema = z
  .string()
  .length(10, "หมายเลขโทรศัพท์ต้องมี 10 หลัก")
  .refine((value) => /^\d+$/.test(value), "หมายเลขโทรศัพท์ต้องเป็นตัวเลข")
  .refine((value) => value.startsWith("0"), "หมายเลขโทรศัพท์ต้องขึ้นต้นด้วย 0");

const voucherCodeSchema = z
  .string()
  .min(1, "กรุณาระบุรหัสหรือ URL Voucher")
  .regex(/^[A-Za-z0-9]+$/, "รูปแบบรหัส Voucher ไม่ถูกต้อง");

const optionsSchema = z.object({
  amount: z
    .number()
    .int("amount: ต้องเป็นจำนวนเต็มหน่วยสตางค์")
    .positive("amount: ต้องมากกว่า 0")
    .min(100, "amount: จำนวนเงินขั้นต่ำ 100 สตางค์")
    .max(20000000, "amount: จำนวนเงินต้องไม่เกิน 200000 บาท")
    .optional(),
});

const inputSchema = z
  .object({
    phoneNumber: phoneNumberSchema.optional(),
    voucherUrlOrCode: z.string().min(1, "กรุณาระบุรหัสหรือ URL Voucher"),
    options: optionsSchema.optional(),
    requirePhoneNumber: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.requirePhoneNumber && !value.phoneNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "กรุณาระบุหมายเลขโทรศัพท์",
      });
    }

    if (!extractVoucherCode(value.voucherUrlOrCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["voucherUrlOrCode"],
        message: "รูปแบบรหัสหรือ URL Voucher ไม่ถูกต้อง",
      });
    }
  });

export function extractVoucherCode(voucherUrlOrCode: string): string | null {
  const input = voucherUrlOrCode.trim();

  if (!input) {
    return null;
  }

  if (/^[A-Za-z0-9]+$/.test(input)) {
    return input;
  }

  try {
    const parsedUrl = new URL(input);
    const voucherCode = parsedUrl.searchParams.get("v");
    return voucherCode && /^[A-Za-z0-9]+$/.test(voucherCode)
      ? voucherCode
      : null;
  } catch {
    return null;
  }
}

export function validateVoucherCode(voucherUrlOrCode: string) {
  const voucherCode = extractVoucherCode(voucherUrlOrCode);
  const result = voucherCodeSchema.safeParse(voucherCode);

  if (!result.success) {
    return failure("INVALID_INPUT", result.error.errors[0].message);
  }

  return {
    success: true as const,
    code: "SUCCESS" as const,
    voucherCode: result.data,
  };
}

export function validateInput(
  input: ValidateInputParams,
): ValidateInputResult {
  const result = inputSchema.safeParse(input);

  if (!result.success) {
    const issues = toValidationIssues(result.error.errors);

    return {
      success: false,
      code: "INVALID_INPUT",
      message: issues.map((issue) => issue.message).join(", "),
      issues,
    };
  }

  return {
    success: true,
    code: "SUCCESS",
    data: {
      ...(result.data.phoneNumber ? { phoneNumber: result.data.phoneNumber } : {}),
      voucherCode: extractVoucherCode(result.data.voucherUrlOrCode) as string,
      options: result.data.options ?? {},
    },
  };
}

export function validatePhoneNumber(phoneNumber: string) {
  const result = phoneNumberSchema.safeParse(phoneNumber);

  if (!result.success) {
    return failure("INVALID_INPUT", result.error.errors[0].message);
  }

  return {
    success: true as const,
    code: "SUCCESS" as const,
    phoneNumber: result.data,
  };
}

export function validateOptions(
  options?: RedeemVoucherOptions | VerifyVoucherOptions,
) {
  const result = optionsSchema.safeParse(options ?? {});

  if (!result.success) {
    return failure("INVALID_INPUT", result.error.errors[0].message);
  }

  return {
    success: true as const,
    code: "SUCCESS" as const,
    options: result.data,
  };
}

function toValidationIssues(issues: z.ZodIssue[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));
}
