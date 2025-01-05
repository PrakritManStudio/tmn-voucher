type StatusCode =
  | "BAD_PARAM" // Bad Parameters
  | "SUCCESS" // success
  | "VOUCHER_NOT_FOUND" // Voucher doesn't exist.
  | "VOUCHER_OUT_OF_STOCK" // Voucher ticket is out of stock.
  | "VOUCHER_EXPIRED" // Voucher is expired.
  | "CANNOT_GET_OWN_VOUCHER" // Cannot redeem your voucher by yourself.
  | "TARGET_USER_NOT_FOUND" // Target user doesn't exist.
  | "TARGET_USER_REDEEMED"; // Target user already redeemed the voucher.

type Status = {
  message: string;
  code: StatusCode;
};

type VoucherStatus = "active" | "redeemed" | "expired";

type Voucher = {
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

type Profile = {
  full_name: string;
};

type RedeemerProfile = {
  mobile_number: string;
} | null;

type MyTicket = {
  mobile: string;
  update_date: number;
  amount_baht: string;
  full_name: string;
  profile_pic: string | null;
} | null;

export type Data = {
  voucher: Voucher;
  owner_profile: Profile;
  redeemer_profile: RedeemerProfile;
  my_ticket: MyTicket;
  tickets: MyTicket[];
};

export type RedeemVoucherResponse = {
  status: Status;
  data: Data | null;
};

export type ReturnData =
  | {
      success: true;
      code: StatusCode;
      message: string;
      data: Data;
    }
  | {
      success: false;
      code: StatusCode;
      message: string;
      data?: Data | null;
    }
  | {
      success: false;
      code: "MAINTEINANCE" | "INVALID_INPUT" | "CONDITION_NOT_MET";
      message: string;
    };

export type ValidateInputResponse =
  | {
      success: true;
      code: "SUCCESS";
    }
  | {
      success: false;
      code: "INVALID_INPUT";
      message: string;
    };

export type MaintenanceResponse =
  | {
      success: true;
      code: "SUCCESS";
    }
  | {
      success: false;
      code: "MAINTEINANCE";
      message: string;
    };

export type Options = {
  amount: number;
};
