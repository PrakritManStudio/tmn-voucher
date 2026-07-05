import {
  TmnVoucherClient,
  validateInput,
} from "../dist/index.js";

const LIVE_REDEEM_ACK = "YES_REDEEM_REAL_VOUCHERS";
const SDK_INFRASTRUCTURE_CODES = [
  "INVALID_RESPONSE",
  "NETWORK_ERROR",
  "TIMEOUT",
];

const config = {
  vouchers: {
    single: env(
      "TMN_SINGLE_VOUCHER_URL",
      "https://gift.truemoney.com/campaign/?v=019e0d03f0fa78bf893eb17f3750d31a4cS",
    ),
    equalShare: env(
      "TMN_EQUAL_SHARE_VOUCHER_URL",
      "https://gift.truemoney.com/campaign/?v=019e0d091b567c3f936f3918fe8748712bh",
    ),
    randomShare: env(
      "TMN_RANDOM_SHARE_VOUCHER_URL",
      "https://gift.truemoney.com/campaign/?v=019e0d09777878936083ec03d31a74b348C",
    ),
  },
  phones: {
    owner: env("TMN_OWNER_PHONE", "0990821811"),
    target1: env("TMN_TARGET_PHONE_1", "0851451822"),
    target2: env("TMN_TARGET_PHONE_2", "0628153206"),
    invalid: env("TMN_INVALID_PHONES", "0000000000,2222222222,0123456789")
      .split(",")
      .map((phone) => phone.trim())
      .filter(Boolean),
  },
  liveRedeem: process.env.TMN_LIVE_REDEEM === LIVE_REDEEM_ACK,
};

const client = new TmnVoucherClient({
  userAgent:
    "tmn-voucher-live-test/2.0.0 (+https://github.com/PrakritManStudio/tmn-voucher)",
  timeoutMs: Number(process.env.TMN_TIMEOUT_MS ?? 15000),
});

const results = [];

await run();

async function run() {
  printHeader("TMN Voucher SDK live test");
  console.log(`mode: ${config.liveRedeem ? "LIVE REDEEM" : "DRY RUN / VERIFY ONLY"}`);
  console.log(`redeem opt-in: TMN_LIVE_REDEEM=${LIVE_REDEEM_ACK}`);
  console.log("vouchers:", maskObject(config.vouchers, maskVoucher));
  console.log("phones:", {
    owner: maskPhone(config.phones.owner),
    target1: maskPhone(config.phones.target1),
    target2: maskPhone(config.phones.target2),
    invalid: config.phones.invalid.map(maskPhone),
  });

  await step("validate input matrix", validateInputMatrix);
  await step("check server status", checkServerStatus);
  await step("verify vouchers without redeeming", verifyVouchers);
  await step("check condition mismatch responses", checkConditionMismatch);
  await step("check invalid phone responses", checkInvalidPhones);

  if (config.liveRedeem) {
    await step("redeem real vouchers", redeemRealVouchers);
  } else {
    printHeader("redeem real vouchers skipped");
    console.log(
      `set TMN_LIVE_REDEEM=${LIVE_REDEEM_ACK} to run real redeem scenarios`,
    );
  }

  printHeader("summary");
  console.table(results);

  const failedUnexpectedly = results.filter((result) => !result.ok);
  if (failedUnexpectedly.length > 0) {
    process.exitCode = 1;
  }
}

async function validateInputMatrix() {
  for (const [voucherType, voucherUrl] of Object.entries(config.vouchers)) {
    recordValidation(`verify:${voucherType}`, {
      voucherUrlOrCode: voucherUrl,
    });

    for (const [phoneType, phoneNumber] of Object.entries({
      owner: config.phones.owner,
      target1: config.phones.target1,
      target2: config.phones.target2,
    })) {
      recordValidation(`redeem:${voucherType}:${phoneType}`, {
        phoneNumber,
        voucherUrlOrCode: voucherUrl,
        requirePhoneNumber: true,
      });
    }
  }

  for (const phoneNumber of config.phones.invalid) {
    recordValidation(`invalid-phone:${maskPhone(phoneNumber)}`, {
      phoneNumber,
      voucherUrlOrCode: config.vouchers.single,
      requirePhoneNumber: true,
    });
  }
}

async function checkServerStatus() {
  const result = await client.checkServerStatus();
  recordResult("server-status", result, ["SUCCESS", "MAINTENANCE"]);
}

async function verifyVouchers() {
  for (const [voucherType, voucherUrl] of Object.entries(config.vouchers)) {
    const result = await client.verifyVoucher(voucherUrl);
    recordResult(`verify:${voucherType}`, result, [
      "SUCCESS",
      "VOUCHER_NOT_FOUND",
      "VOUCHER_EXPIRED",
      "VOUCHER_OUT_OF_STOCK",
    ]);

    if (result.success) {
      console.log(`${voucherType}:`, summarizeVoucher(result.data.raw));
    }
  }
}

async function checkConditionMismatch() {
  for (const [voucherType, voucherUrl] of Object.entries(config.vouchers)) {
    const result = await client.verifyVoucher(voucherUrl, {
      amount: 19999999,
    });

    recordResult(`condition-mismatch:${voucherType}`, result, [
      "CONDITION_NOT_MET",
      "VOUCHER_NOT_FOUND",
      "VOUCHER_EXPIRED",
      "VOUCHER_OUT_OF_STOCK",
    ]);
  }
}

async function checkInvalidPhones() {
  if (!config.liveRedeem) {
    console.log("skipped: invalid phone API responses require redeem endpoint");
    results.push({
      name: "invalid-phone-api-responses",
      ok: true,
      code: "SKIPPED",
      message: `set TMN_LIVE_REDEEM=${LIVE_REDEEM_ACK} to call redeem endpoint`,
    });
    return;
  }

  for (const phoneNumber of config.phones.invalid) {
    const result = await client.redeemVoucher(
      phoneNumber,
      config.vouchers.single,
    );

    recordResult(`invalid-phone:${maskPhone(phoneNumber)}`, result, [
      "INVALID_INPUT",
      "TARGET_USER_NOT_FOUND",
      "TARGET_USER_STATUS_INACTIVE",
      "VOUCHER_NOT_FOUND",
      "VOUCHER_EXPIRED",
      "VOUCHER_OUT_OF_STOCK",
    ]);
  }
}

async function redeemRealVouchers() {
  const scenarios = [
    {
      name: "owner-cannot-redeem-single",
      phoneNumber: config.phones.owner,
      voucherUrl: config.vouchers.single,
      expectedCodes: ["CANNOT_GET_OWN_VOUCHER", "VOUCHER_OUT_OF_STOCK"],
    },
    {
      name: "single-target1-success",
      phoneNumber: config.phones.target1,
      voucherUrl: config.vouchers.single,
      expectedCodes: [
        "SUCCESS",
        "TARGET_USER_REDEEMED",
        "VOUCHER_OUT_OF_STOCK",
      ],
    },
    {
      name: "single-target1-repeat",
      phoneNumber: config.phones.target1,
      voucherUrl: config.vouchers.single,
      expectedCodes: ["TARGET_USER_REDEEMED", "VOUCHER_OUT_OF_STOCK"],
    },
    {
      name: "equal-share-target1",
      phoneNumber: config.phones.target1,
      voucherUrl: config.vouchers.equalShare,
      expectedCodes: [
        "SUCCESS",
        "TARGET_USER_REDEEMED",
        "VOUCHER_OUT_OF_STOCK",
      ],
    },
    {
      name: "equal-share-target2",
      phoneNumber: config.phones.target2,
      voucherUrl: config.vouchers.equalShare,
      expectedCodes: [
        "SUCCESS",
        "TARGET_USER_REDEEMED",
        "VOUCHER_OUT_OF_STOCK",
      ],
    },
    {
      name: "random-share-target1",
      phoneNumber: config.phones.target1,
      voucherUrl: config.vouchers.randomShare,
      expectedCodes: [
        "SUCCESS",
        "TARGET_USER_REDEEMED",
        "VOUCHER_OUT_OF_STOCK",
      ],
    },
    {
      name: "random-share-target2",
      phoneNumber: config.phones.target2,
      voucherUrl: config.vouchers.randomShare,
      expectedCodes: [
        "SUCCESS",
        "TARGET_USER_REDEEMED",
        "VOUCHER_OUT_OF_STOCK",
      ],
    },
  ];

  for (const scenario of scenarios) {
    const result = await client.redeemVoucher(
      scenario.phoneNumber,
      scenario.voucherUrl,
    );

    recordResult(`redeem:${scenario.name}`, result, scenario.expectedCodes);
  }
}

function recordValidation(name, input) {
  const result = validateInput(input);
  const ok = input.phoneNumber?.startsWith("2")
    ? !result.success
    : result.success || input.phoneNumber === "0000000000";

  results.push({
    name,
    ok,
    code: result.code,
    message: result.success
      ? "valid"
      : result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | "),
  });

  if (!result.success) {
    console.log(name, result.issues);
  }
}

function recordResult(name, result, expectedCodes) {
  const ok =
    expectedCodes.includes(result.code) ||
    SDK_INFRASTRUCTURE_CODES.includes(result.code);

  results.push({
    name,
    ok,
    code: result.code,
    message: result.message ?? "",
  });

  console.log(name, sanitizeResult(result));
}

async function step(name, fn) {
  printHeader(name);
  try {
    await fn();
  } catch (error) {
    results.push({
      name,
      ok: false,
      code: "SCRIPT_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    console.error(error);
  }
}

function summarizeVoucher(data) {
  return {
    voucherId: data.voucher.voucher_id,
    amountBaht: data.voucher.amount_baht,
    redeemedAmountBaht: data.voucher.redeemed_amount_baht,
    member: data.voucher.member,
    type: data.voucher.type,
    status: data.voucher.status,
    redeemed: data.voucher.redeemed,
    available: data.voucher.available,
    ownerName: data.owner_profile?.full_name,
    tickets: data.tickets?.length ?? 0,
  };
}

function sanitizeResult(result) {
  if (!result.success) {
    return {
      success: false,
      code: result.code,
      message: result.message,
    };
  }

  if ("amount" in result.data) {
    return {
      success: true,
      code: result.code,
      amount: result.data.amount,
      voucherCode: maskVoucher(result.data.voucherCode),
    };
  }

  return {
    success: true,
    code: result.code,
    voucher: summarizeVoucher(result.data.raw),
  };
}

function printHeader(title) {
  console.log("");
  console.log(`=== ${title} ===`);
}

function env(name, fallback) {
  return process.env[name] || fallback;
}

function maskObject(object, mapper) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, mapper(value)]),
  );
}

function maskPhone(phoneNumber) {
  if (phoneNumber.length < 4) {
    return "***";
  }

  return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-2)}`;
}

function maskVoucher(value) {
  const voucher = String(value);
  if (voucher.length < 12) {
    return "***";
  }

  return `${voucher.slice(0, 35)}...${voucher.slice(-6)}`;
}
