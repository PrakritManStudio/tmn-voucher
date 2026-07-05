import test from "node:test";
import assert from "node:assert/strict";
import {
  createTmnVoucherClient,
  DEFAULT_BASE_API_URL,
  DEFAULT_USER_AGENT,
  extractVoucherCode,
  validateInput,
} from "../dist/index.js";

const voucherData = {
  voucher: {
    voucher_id: "voucher-id",
    amount_baht: "100.00",
    redeemed_amount_baht: "0.00",
    member: 1,
    status: "active",
    link: "https://gift.truemoney.com/campaign/?v=ABC123",
    detail: "",
    expire_date: 1893456000,
    type: "F",
    redeemed: 0,
    available: 1,
  },
  owner_profile: {
    full_name: "Owner",
  },
  redeemer_profile: null,
  my_ticket: {
    mobile: "0812345678",
    update_date: 1893456000,
    amount_baht: "100.00",
    full_name: "Receiver",
    profile_pic: null,
  },
  tickets: [],
};

const configurationData = {
  deeplink_register: "",
  deeplink_app: "",
  theme: {},
  ma: {
    title_th: null,
    title_en: null,
    message_th: null,
    message_en: null,
  },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("exports defaults and extracts voucher codes", () => {
  assert.equal(DEFAULT_BASE_API_URL, "https://gift.truemoney.com");
  assert.match(DEFAULT_USER_AGENT, /@prakrit_m\/tmn-voucher\/2\.0\.0/);
  assert.equal(
    extractVoucherCode("https://gift.truemoney.com/campaign/?v=ABC123"),
    "ABC123",
  );
  assert.equal(
    extractVoucherCode("https://gift.truemoney.com/campaign/voucher_detail?v=ABC123"),
    "ABC123",
  );
  assert.equal(extractVoucherCode("ABC123"), "ABC123");
});

test("checkServerStatus returns success", async () => {
  const client = createTmnVoucherClient({
    fetch: async (url) => {
      assert.equal(
        String(url),
        "https://gift.truemoney.com/campaign/vouchers/configuration",
      );

      return jsonResponse({
        status: {
          code: "SUCCESS",
          message: "ok",
        },
        data: configurationData,
      });
    },
  });

  assert.deepEqual(await client.checkServerStatus(), {
    success: true,
    code: "SUCCESS",
    message: "ok",
  });
});

test("checkServerStatus returns maintenance when ma has content", async () => {
  const client = createTmnVoucherClient({
    fetch: async () =>
      jsonResponse({
        status: {
          code: "MAINTENANCE",
          message: "maintenance",
        },
        data: {
          ...configurationData,
          ma: {
            title_th: "ปิดปรับปรุงระบบ",
            title_en: "",
            message_th: "กรุณาลองใหม่ภายหลัง",
            message_en: "",
          },
        },
      }),
  });

  const result = await client.checkServerStatus();

  assert.equal(result.success, false);
  assert.equal(result.code, "MAINTENANCE");
  assert.equal(result.message, "ปิดปรับปรุงระบบ");
});

test("checkServerStatus returns maintenance when status code is MAINTENANCE without ma content", async () => {
  const client = createTmnVoucherClient({
    fetch: async () =>
      jsonResponse({
        status: {
          code: "MAINTENANCE",
          message: "ระบบปิดปรับปรุงชั่วคราว",
        },
        data: configurationData,
      }),
  });

  const result = await client.checkServerStatus();

  assert.equal(result.success, false);
  assert.equal(result.code, "MAINTENANCE");
  assert.equal(result.message, "ระบบปิดปรับปรุงชั่วคราว");
});

test("checkServerStatus maps HTTP error response", async () => {
  const client = createTmnVoucherClient({
    fetch: async () => jsonResponse({ error: "bad gateway" }, 502),
  });

  const result = await client.checkServerStatus();

  assert.equal(result.success, false);
  assert.equal(result.code, "INVALID_RESPONSE");
  assert.match(result.message, /^HTTP 502:/);
});

test("validateInput returns all zod issues", () => {
  const result = validateInput({
    phoneNumber: "8123abc",
    voucherUrlOrCode: "https://gift.truemoney.com/campaign/?v=***",
    options: {
      amount: 50.5,
    },
    requirePhoneNumber: true,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "INVALID_INPUT");
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      "phoneNumber",
      "phoneNumber",
      "phoneNumber",
      "options.amount",
      "options.amount",
      "voucherUrlOrCode",
    ],
  );
});

test("client exposes validateInput helper", () => {
  const client = createTmnVoucherClient();
  const result = client.validateInput({
    phoneNumber: "0812345678",
    voucherUrlOrCode: "ABC123",
    requirePhoneNumber: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.phoneNumber, "0812345678");
  assert.equal(result.data.voucherCode, "ABC123");
});

test("verifyVoucher checks conditions without redeeming", async () => {
  const calledUrls = [];
  const client = createTmnVoucherClient({
    baseApiUrl: "https://mock.local/",
    fetch: async (url) => {
      calledUrls.push(String(url));
      return jsonResponse({
        status: {
          code: "SUCCESS",
          message: "verified",
        },
        data: voucherData,
      });
    },
  });

  const result = await client.verifyVoucher("ABC123", {
    amount: 10000,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.voucherCode, "ABC123");
  assert.equal(result.data.voucher.amount_baht, "100.00");
  assert.equal(result.data.voucher.type, "F");
  assert.equal(result.data.voucher.member, 1);
  assert.equal(result.data.ownerProfile.full_name, "Owner");
  assert.deepEqual(calledUrls, [
    "https://mock.local/campaign/vouchers/ABC123/verify",
  ]);
});

test("verifyVoucher returns condition error when amount does not match", async () => {
  const client = createTmnVoucherClient({
    fetch: async () =>
      jsonResponse({
        status: {
          code: "SUCCESS",
          message: "verified",
        },
        data: voucherData,
      }),
  });

  const result = await client.verifyVoucher("ABC123", {
    amount: 20000,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "CONDITION_NOT_MET");
});

test("redeemVoucher verifies before redeeming", async () => {
  const calledUrls = [];
  const client = createTmnVoucherClient({
    fetch: async (url) => {
      calledUrls.push(String(url));

      if (String(url).endsWith("/configuration")) {
        return jsonResponse({
          status: {
          code: "SUCCESS",
          message: "ok",
        },
          data: configurationData,
        });
      }

      return jsonResponse({
        status: {
          code: "SUCCESS",
          message: "ok",
        },
        data: voucherData,
      });
    },
  });

  const result = await client.redeemVoucher("0812345678", "ABC123", {
    amount: 10000,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.amount, 10000);
  assert.equal(result.data.raw.my_ticket.amount_baht, "100.00");
  assert.equal(result.data.raw.my_ticket.full_name, "Receiver");
  assert.deepEqual(calledUrls, [
    "https://gift.truemoney.com/campaign/vouchers/configuration",
    "https://gift.truemoney.com/campaign/vouchers/ABC123/verify",
    "https://gift.truemoney.com/campaign/vouchers/ABC123/redeem",
  ]);
});

test("redeemVoucher does not redeem when verify condition fails", async () => {
  const calledUrls = [];
  const client = createTmnVoucherClient({
    fetch: async (url) => {
      calledUrls.push(String(url));

      if (String(url).endsWith("/configuration")) {
        return jsonResponse({
          status: {
          code: "SUCCESS",
          message: "ok",
        },
          data: configurationData,
        });
      }

      return jsonResponse({
        status: {
          code: "SUCCESS",
          message: "verified",
        },
        data: voucherData,
      });
    },
  });

  const result = await client.redeemVoucher("0812345678", "ABC123", {
    amount: 20000,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "CONDITION_NOT_MET");
  assert.deepEqual(calledUrls, [
    "https://gift.truemoney.com/campaign/vouchers/configuration",
    "https://gift.truemoney.com/campaign/vouchers/ABC123/verify",
  ]);
});

test("redeemVoucher validates inputs", async () => {
  const client = createTmnVoucherClient({
    fetch: async () => {
      throw new Error("fetch should not be called");
    },
  });

  const result = await client.redeemVoucher("812345678", "ABC123");

  assert.equal(result.success, false);
  assert.equal(result.code, "INVALID_INPUT");
});

test("checkServerStatus maps network error", async () => {
  const client = createTmnVoucherClient({
    fetch: async () => {
      throw new Error("offline");
    },
  });

  const result = await client.checkServerStatus();

  assert.equal(result.success, false);
  assert.equal(result.code, "NETWORK_ERROR");
});

function createMockClient(voucherPayload) {
  return createTmnVoucherClient({
    baseApiUrl: "https://mock.local/",
    fetch: async () =>
      jsonResponse({
        status: {
          code: "SUCCESS",
          message: "verified",
        },
        data: voucherPayload,
      }),
  });
}

function createMultiMemberVoucher(overrides = {}) {
  const { voucher: voucherOverrides = {}, ...restOverrides } = overrides;

  return {
    voucher: {
      voucher_id: "multi-id",
      amount_baht: "300.00",
      redeemed_amount_baht: "100.00",
      member: 3,
      status: "active",
      link: "https://gift.truemoney.com/campaign/?v=MULTI123",
      detail: "",
      expire_date: 1893456000,
      type: "R",
      redeemed: 1,
      available: 1,
      ...voucherOverrides,
    },
    owner_profile: {
      full_name: "Owner",
    },
    redeemer_profile: null,
    my_ticket: null,
    tickets: [],
    ...restOverrides,
  };
}

test("verifyVoucher matches random voucher remaining balance", async () => {
  const client = createMockClient(createMultiMemberVoucher());

  const result = await client.verifyVoucher("MULTI123", {
    amount: 20000,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.voucher.type, "R");
  assert.equal(result.data.voucher.amount_baht, "300.00");
  assert.equal(result.data.voucher.redeemed_amount_baht, "100.00");
});

test("verifyVoucher rejects random voucher when amount exceeds balance", async () => {
  const client = createMockClient(createMultiMemberVoucher());

  const result = await client.verifyVoucher("MULTI123", {
    amount: 30000,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "CONDITION_NOT_MET");
});

test("verifyVoucher matches fixed voucher per-member amount", async () => {
  const client = createMockClient(
    createMultiMemberVoucher({
      voucher: {
        type: "F",
        redeemed_amount_baht: "0.00",
        redeemed: 0,
      },
    }),
  );

  const result = await client.verifyVoucher("MULTI123", {
    amount: 10000,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.voucher.type, "F");
  assert.equal(result.data.voucher.member, 3);
});

test("verifyVoucher rejects fixed voucher when per-member amount does not match", async () => {
  const client = createMockClient(
    createMultiMemberVoucher({
      voucher: {
        type: "F",
        redeemed_amount_baht: "0.00",
        redeemed: 0,
      },
    }),
  );

  const result = await client.verifyVoucher("MULTI123", {
    amount: 20000,
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "CONDITION_NOT_MET");
});

test("verifyVoucher maps HTTP error response", async () => {
  const client = createTmnVoucherClient({
    fetch: async () => jsonResponse({ error: "service unavailable" }, 503),
  });

  const result = await client.verifyVoucher("ABC123");

  assert.equal(result.success, false);
  assert.equal(result.code, "INVALID_RESPONSE");
  assert.match(result.message, /^HTTP 503:/);
});
