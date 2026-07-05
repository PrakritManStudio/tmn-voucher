# @prakrit_m/tmn-voucher

SDK ภาษา TypeScript สำหรับตรวจสอบและแลกคูปองอั่งเปา TrueMoney Wallet แบบ third-party

> SDK นี้พัฒนาโดยบุคคลภายนอก ไม่ใช่ผลิตภัณฑ์อย่างเป็นทางการจาก TrueMoney

## คุณสมบัติหลัก

- ใช้งานแบบ class (`TmnVoucherClient`)
- รองรับทั้ง ESM และ CommonJS
- คืนผลลัพธ์แบบ result object ไม่ throw สำหรับ validation / network / API error
- รองรับ custom `fetch` สำหรับ test หรือ proxy
- เก็บ type จาก TrueMoney API ตามเดิม (snake_case) ไม่แปลง response model
- `options.amount` และ `redeem` result ใช้หน่วย **สตางค์** (เช่น 15 บาท = `1500`)

## Installation

```bash
pnpm add @prakrit_m/tmn-voucher
```

```bash
npm install @prakrit_m/tmn-voucher
```

```bash
yarn add @prakrit_m/tmn-voucher
```

## Quick Start

```typescript
import { TmnVoucherClient } from "@prakrit_m/tmn-voucher";

const client = new TmnVoucherClient();

const result = await client.redeemVoucher(
  "0812345678",
  "https://gift.truemoney.com/campaign/?v=YOUR_VOUCHER_CODE",
  {
    amount: 10000, // 100 บาท หน่วยเป็นสตางค์
  },
);

if (result.success) {
  console.log("แลกคูปองสำเร็จ", result.data.amount); // สตางค์
  console.log("ข้อมูลจาก API", result.data.raw);
} else {
  console.log("แลกคูปองไม่สำเร็จ", result.code, result.message);
}
```

## การสร้าง Client

```typescript
import { createTmnVoucherClient } from "@prakrit_m/tmn-voucher";

const client = createTmnVoucherClient({
  baseApiUrl: "https://gift.truemoney.com",
  userAgent: "my-app/1.0.0 (+https://example.com)",
  headers: {
    "X-App-Name": "my-app",
  },
  timeoutMs: 15000,
});
```

หรือใช้ constructor โดยตรง:

```typescript
import { TmnVoucherClient } from "@prakrit_m/tmn-voucher";

const client = new TmnVoucherClient();
```

### `TmnVoucherClientConfig`

| option | ค่าเริ่มต้น | คำอธิบาย |
| --- | --- | --- |
| `baseApiUrl` | `https://gift.truemoney.com` | Base URL ของ API ใช้เปลี่ยนเป็น mock server หรือ endpoint อื่นได้ |
| `userAgent` | `@prakrit_m/tmn-voucher/2.0.0 (third-party-sdk; +https://github.com/PrakritManStudio/tmn-voucher)` | User-Agent เริ่มต้นของ SDK |
| `headers` | `{}` | Header เพิ่มเติมที่ส่งไปกับทุก request |
| `fetch` | `globalThis.fetch` | Custom fetch สำหรับ test, proxy, retry layer หรือ runtime ที่ไม่มี fetch |
| `timeoutMs` | `15000` | เวลารอ API สูงสุดต่อ request หน่วยเป็น milliseconds |

หมายเหตุ: runtime ฝั่ง browser บางตัวอาจไม่อนุญาตให้ตั้งค่า `User-Agent` header เอง แม้ SDK จะส่งค่าไว้ให้ก็ตาม

## หน่วยเงิน (Amount)

SDK ใช้สตางค์เป็น integer สำหรับ input และ redeem output:

| ตำแหน่ง | หน่วย | ตัวอย่าง |
| --- | --- | --- |
| `options.amount` | สตางค์ | `1500` = 15 บาท |
| `redeemVoucher` → `data.amount` | สตางค์ | แปลงจาก `my_ticket.amount_baht` |
| ฟิลด์จาก API เช่น `amount_baht` | บาท (string) | `"100.00"` ตาม TrueMoney API |

ข้อจำกัดของ `options.amount`:

- ต้องเป็นจำนวนเต็ม
- ขั้นต่ำ `100` สตางค์ (1 บาท)
- สูงสุด `20000000` สตางค์ (200000 บาท)

## Response Types จาก API

SDK ไม่แปลง shape ของข้อมูลจาก TrueMoney API ฟิลด์เช่น `amount_baht`, `full_name`, `expire_date` ยังเป็นรูปแบบเดิม

```typescript
type Voucher = {
  voucher_id: string;
  amount_baht: string;
  redeemed_amount_baht: string;
  member: number;
  status: "active" | "redeemed" | "expired";
  link: string;
  detail: string;
  expire_date: number;
  type: "R" | "F"; // R = random, F = fixed (แบ่งเท่า)
  redeemed: number;
  available: number;
};

type VoucherData = {
  voucher: Voucher;
  owner_profile: Profile;
  redeemer_profile?: RedeemerProfile | null;
  my_ticket?: MyTicket | null;
  tickets?: MyTicket[];
};
```

SDK เพิ่มฟิลด์ convenience บางตัวใน result เท่านั้น เช่น `voucherCode` และ `ownerProfile` (alias ของ `owner_profile` แต่ type ยังเป็น `Profile` เดิม)

## ตรวจข้อมูลก่อนเรียก API

### `validateInput(input)`

ตรวจข้อมูลโดยไม่เรียก API เหมาะสำหรับ validate form ก่อนส่งคำสั่งจริง

```typescript
import { validateInput } from "@prakrit_m/tmn-voucher";

const validation = validateInput({
  phoneNumber: "0812345678",
  voucherUrlOrCode: "https://gift.truemoney.com/campaign/?v=YOUR_VOUCHER_CODE",
  options: {
    amount: 10000,
  },
  requirePhoneNumber: true,
});

if (!validation.success) {
  console.log(validation.message);
  console.table(validation.issues);
}
```

เรียกผ่าน client ได้เช่นกัน:

```typescript
const validation = client.validateInput({
  phoneNumber: "0812345678",
  voucherUrlOrCode: "YOUR_VOUCHER_CODE",
  requirePhoneNumber: true,
});
```

พารามิเตอร์:

- `phoneNumber` — เบอร์ 10 หลัก ขึ้นต้นด้วย `0`
- `voucherUrlOrCode` — URL voucher หรือ voucher code
- `options.amount` — จำนวนเงินหน่วยสตางค์
- `requirePhoneNumber` — ถ้าเป็น `true` จะบังคับให้ส่ง `phoneNumber` (เหมาะกับ flow redeem)

`issues` มีรูปแบบ:

```typescript
type ValidationIssue = {
  path: string;   // เช่น "phoneNumber", "voucherUrlOrCode", "options.amount"
  code: string;   // Zod issue code เช่น "too_small", "invalid_type", "custom"
  message: string; // เหตุผลภาษาไทย
};
```

### `extractVoucherCode(voucherUrlOrCode)`

ดึง voucher code จาก URL หรือคืนค่า code ตรง ๆ

```typescript
import { extractVoucherCode } from "@prakrit_m/tmn-voucher";

extractVoucherCode("https://gift.truemoney.com/campaign/?v=ABC123"); // "ABC123"
extractVoucherCode("ABC123"); // "ABC123"
```

## API Methods

### `client.checkServerStatus()`

เช็คว่า server ของ TrueMoney voucher พร้อมใช้งานหรืออยู่ในช่วง maintenance

```typescript
const status = await client.checkServerStatus();

if (status.success) {
  console.log("server พร้อมใช้งาน");
} else {
  console.log(status.code, status.message);
}
```

ผลลัพธ์ที่เป็นไปได้:

- `SUCCESS` — server พร้อมใช้งาน
- `MAINTENANCE` — server อยู่ในช่วงปิดปรับปรุง
- `NETWORK_ERROR` — เชื่อมต่อ API ไม่สำเร็จ
- `TIMEOUT` — API ตอบกลับช้ากว่า `timeoutMs`
- `INVALID_RESPONSE` — HTTP error หรือ response ไม่ตรงรูปแบบ

SDK จะคืน `MAINTENANCE` เมื่อ:

- `status.code` เป็น `MAINTENANCE` หรือ
- `data.ma` มีข้อความใน `title_th`, `title_en`, `message_th`, `message_en` อย่างน้อยหนึ่งช่อง

### `client.verifyVoucher(voucherUrlOrCode, options?)`

เช็คข้อมูล voucher โดยไม่ redeem รองรับทั้ง URL เต็มและ voucher code

```typescript
const result = await client.verifyVoucher(
  "https://gift.truemoney.com/campaign/?v=YOUR_VOUCHER_CODE",
  {
    amount: 10000,
  },
);

if (result.success) {
  console.log(result.data.voucherCode);
  console.log(result.data.voucher.amount_baht);
  console.log(result.data.ownerProfile.full_name);
  console.log(result.data.tickets);
  console.log(result.data.raw);
} else {
  console.log(result.code, result.message);
}
```

`VerifyVoucherData`:

```typescript
type VerifyVoucherData = {
  voucherCode: string;
  voucher: Voucher;
  ownerProfile: Profile;
  tickets: MyTicket[];
  raw: VoucherData;
};
```

### `client.redeemVoucher(phoneNumber, voucherUrlOrCode, options?)`

flow การทำงาน:

1. validate เบอร์โทรและ voucher code
2. `checkServerStatus()`
3. ถ้าระบุ `options.amount` จะ `verifyVoucher()` ก่อน
4. เรียก redeem endpoint

```typescript
const result = await client.redeemVoucher(
  "0812345678",
  "YOUR_VOUCHER_CODE",
  {
    amount: 10000,
  },
);

if (result.success) {
  console.log(result.data.amount); // สตางค์ที่ได้รับ
  console.log(result.data.raw.my_ticket);
} else {
  console.log(result.code, result.message);
}
```

`RedeemVoucherData`:

```typescript
type RedeemVoucherData = {
  voucherCode: string;
  amount: number; // สตางค์
  raw: VoucherData;
};
```

ถ้าระบุ `options.amount` แล้วไม่ตรงเงื่อนไข SDK จะไม่ยิง redeem request และคืน `CONDITION_NOT_MET`

## เงื่อนไข `options.amount`

ถ้าไม่ระบุ `options.amount` SDK จะข้ามการตรวจเงื่อนไขจำนวนเงิน

| ประเภท voucher | เงื่อนไข |
| --- | --- |
| `member === 1` | `amount` ต้องเท่ากับยอดรวมของ voucher (สตางค์) |
| `member > 1` และ `type === "R"` | `amount` ต้องเท่ากับยอดคงเหลือ (`amount_baht - redeemed_amount_baht`) และ `available === 1` |
| `member > 1` และ `type === "F"` | `amount` ต้องเท่ากับยอดต่อคน (`amount_baht / member`) |

## Result Pattern

ทุก method จะ resolve เป็น object เสมอ ไม่ throw สำหรับ validation, network, timeout หรือ API error

```typescript
type SdkResult<TData> =
  | {
      success: true;
      code: "SUCCESS";
      message?: string;
      data: TData;
    }
  | {
      success: false;
      code: string;
      message: string;
      data?: unknown;
    };
```

ตรวจผลลัพธ์ด้วย `result.success` ก่อนเข้าถึง `result.data`

## Response Codes

| code | ความหมาย |
| --- | --- |
| `SUCCESS` | ทำรายการสำเร็จ |
| `BAD_PARAM` | parameter ที่ส่งให้ API ไม่ถูกต้อง |
| `VOUCHER_NOT_FOUND` | ไม่พบ voucher |
| `VOUCHER_OUT_OF_STOCK` | voucher ถูกใช้หมดแล้ว |
| `VOUCHER_EXPIRED` | voucher หมดอายุ |
| `CANNOT_GET_OWN_VOUCHER` | ไม่สามารถใช้ voucher ของตัวเองได้ |
| `TARGET_USER_NOT_FOUND` | ไม่พบผู้ใช้ปลายทาง |
| `TARGET_USER_REDEEMED` | ผู้ใช้นี้เคย redeem voucher แล้ว |
| `TARGET_USER_STATUS_INACTIVE` | บัญชีผู้ใช้ปลายทางไม่พร้อมใช้งาน |
| `INTERNAL_ERROR` | API เกิดข้อผิดพลาดภายใน |
| `INVALID_INPUT` | input ที่ส่งเข้า SDK ไม่ถูกต้อง |
| `CONDITION_NOT_MET` | voucher ไม่ตรงเงื่อนไขที่กำหนด เช่น amount ไม่ตรง |
| `MAINTENANCE` | server อยู่ในช่วงปิดปรับปรุง |
| `NETWORK_ERROR` | เชื่อมต่อ API ไม่สำเร็จ |
| `TIMEOUT` | API ใช้เวลานานเกิน `timeoutMs` |
| `INVALID_RESPONSE` | HTTP status ไม่สำเร็จ หรือ response ไม่ตรงรูปแบบ |

## Exports

### Runtime

- `TmnVoucherClient`
- `createTmnVoucherClient`
- `validateInput`
- `extractVoucherCode`
- `DEFAULT_BASE_API_URL`
- `DEFAULT_TIMEOUT_MS`
- `DEFAULT_USER_AGENT`

### Types

- `TmnVoucherClientConfig`, `VerifyVoucherOptions`, `RedeemVoucherOptions`
- `ValidateInputParams`, `ValidateInputResult`, `ValidationIssue`
- `VerifyVoucherData`, `RedeemVoucherData`, `VerifyVoucherResult`, `RedeemVoucherResult`
- `Voucher`, `VoucherData`, `Profile`, `MyTicket`, `RedeemerProfile`
- `SdkResult`, `SdkSuccess`, `SdkFailure`, `StatusCode`, `ServerStatusResult`
- `TrueMoneyResponse`, `TrueMoneyStatusCode`, `SdkStatusCode`

## Migration จาก v1 เป็น v2

v2 เป็น breaking change และลบ default export เดิมออกแล้ว

```typescript
// v1
import redeemvouchers from "@prakrit_m/tmn-voucher";

await redeemvouchers("0812345678", voucherUrl, { amount: 10000 });
```

```typescript
// v2
import { TmnVoucherClient } from "@prakrit_m/tmn-voucher";

const client = new TmnVoucherClient();
await client.redeemVoucher("0812345678", voucherUrl, { amount: 10000 });
```

สิ่งที่เปลี่ยนใน v2:

- ใช้ class-based client แทน default export function
- result pattern แบบ `success: true | false` ไม่ throw
- แยก `verifyVoucher()` และ `checkServerStatus()`
- `validateInput()` และ `extractVoucherCode()` เป็น public API
- รองรับ custom `fetch` และ `timeoutMs`
- `options.amount` ใช้สตางค์

## Development

```bash
pnpm install
pnpm build
pnpm test
```

### Live Test ด้วย Voucher จริง

```bash
pnpm run test:live
```

ค่าเริ่มต้นเป็น dry-run / verify-only:

- validate input matrix
- check server status
- verify voucher หลายแบบโดยไม่ redeem
- ตรวจ `CONDITION_NOT_MET` ด้วย amount ที่ตั้งใจไม่ตรง
- ไม่เรียก redeem endpoint ใน dry-run

ถ้าต้องการ redeem จริง ต้อง opt-in ชัดเจน:

```powershell
$env:TMN_LIVE_REDEEM="YES_REDEEM_REAL_VOUCHERS"
pnpm run test:live
```

ปรับข้อมูลทดสอบผ่าน environment variables:

```powershell
$env:TMN_SINGLE_VOUCHER_URL="https://gift.truemoney.com/campaign/?v=..."
$env:TMN_EQUAL_SHARE_VOUCHER_URL="https://gift.truemoney.com/campaign/?v=..."
$env:TMN_RANDOM_SHARE_VOUCHER_URL="https://gift.truemoney.com/campaign/?v=..."
$env:TMN_OWNER_PHONE="0999999999"
$env:TMN_TARGET_PHONE_1="0888888888"
$env:TMN_TARGET_PHONE_2="0777777777"
$env:TMN_INVALID_PHONES="0000000000,2222222222"
pnpm run test:live
```

## License

Licensed under [ISC](LICENSE)
