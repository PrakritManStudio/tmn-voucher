export type TrueMoneyStatusCode =
  | "BAD_PARAM"
  | "SUCCESS"
  | "VOUCHER_NOT_FOUND"
  | "VOUCHER_OUT_OF_STOCK"
  | "VOUCHER_EXPIRED"
  | "CANNOT_GET_OWN_VOUCHER"
  | "TARGET_USER_NOT_FOUND"
  | "TARGET_USER_REDEEMED"
  | "TARGET_USER_STATUS_INACTIVE"
  | "INTERNAL_ERROR";

export type SdkStatusCode =
  | "INVALID_INPUT"
  | "CONDITION_NOT_MET"
  | "MAINTENANCE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE";

export type StatusCode = TrueMoneyStatusCode | SdkStatusCode;

export type VoucherStatus = "active" | "redeemed" | "expired";

export type Voucher = {
  voucher_id: string;
  amount_baht: string;
  redeemed_amount_baht: string;
  member: number;
  status: VoucherStatus;
  link: string;
  detail: string;
  expire_date: number;
  type: "R" | "F";
  redeemed: number;
  available: number;
};

export type Profile = {
  full_name: string;
};

export type RedeemerProfile = {
  mobile_number: string;
};

export type MyTicket = {
  mobile: string;
  update_date: number;
  amount_baht: string;
  full_name: string;
  profile_pic: string | null;
};

export type VoucherData = {
  voucher: Voucher;
  owner_profile: Profile;
  redeemer_profile?: RedeemerProfile | null;
  my_ticket?: MyTicket | null;
  tickets?: MyTicket[];
};

export type TrueMoneyResponse<TData = VoucherData | null> = {
  status?: {
    code?: string;
    message?: string;
  };
  data?: TData;
};

export type MaintenanceInfo = {
  title_th: string | null;
  title_en: string | null;
  message_th: string | null;
  message_en: string | null;
};

export type ConfigurationData = {
  deeplink_register?: string;
  deeplink_app?: string;
  theme?: unknown;
  ma?: MaintenanceInfo;
};

export type SdkSuccess<TCode extends StatusCode = "SUCCESS", TData = undefined> =
  TData extends undefined
    ? {
        success: true;
        code: TCode;
        message?: string;
      }
    : {
        success: true;
        code: TCode;
        message?: string;
        data: TData;
      };

export type SdkFailure<
  TCode extends Exclude<StatusCode, "SUCCESS"> = Exclude<StatusCode, "SUCCESS">,
> = {
  success: false;
  code: TCode;
  message: string;
  data?: unknown;
};

export type SdkResult<TData = undefined> =
  | SdkSuccess<"SUCCESS", TData>
  | SdkFailure;

export type ServerStatusResult =
  | SdkSuccess
  | SdkFailure<"MAINTENANCE" | "NETWORK_ERROR" | "TIMEOUT" | "INVALID_RESPONSE">;

export type VerifyVoucherOptions = {
  amount?: number;
};

export type RedeemVoucherOptions = VerifyVoucherOptions;

export type ValidateInputParams = {
  phoneNumber?: string;
  voucherUrlOrCode: string;
  options?: VerifyVoucherOptions;
  requirePhoneNumber?: boolean;
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ValidateInputResult =
  | {
      success: true;
      code: "SUCCESS";
      data: {
        phoneNumber?: string;
        voucherCode: string;
        options: VerifyVoucherOptions;
      };
    }
  | {
      success: false;
      code: "INVALID_INPUT";
      message: string;
      issues: ValidationIssue[];
    };

export type VerifyVoucherData = {
  voucherCode: string;
  voucher: Voucher;
  ownerProfile: Profile;
  tickets: MyTicket[];
  raw: VoucherData;
};

export type RedeemVoucherData = {
  voucherCode: string;
  amount: number;
  raw: VoucherData;
};

export type VerifyVoucherResult =
  | SdkSuccess<"SUCCESS", VerifyVoucherData>
  | SdkFailure<Exclude<StatusCode, "SUCCESS">>;

export type RedeemVoucherResult =
  | SdkSuccess<"SUCCESS", RedeemVoucherData>
  | SdkFailure<Exclude<StatusCode, "SUCCESS">>;

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type TmnVoucherClientConfig = {
  baseApiUrl?: string;
  userAgent?: string;
  headers?: HeadersInit;
  fetch?: FetchLike;
  timeoutMs?: number;
};

export type ResolvedTmnVoucherClientConfig = {
  baseApiUrl: string;
  userAgent: string;
  headers: HeadersInit;
  fetch: FetchLike;
  timeoutMs: number;
};
