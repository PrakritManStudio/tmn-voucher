# @prakrit_m/tmn-voucher 🎟️

ไลบรารี TypeScript สำหรับการแลกคูปองอั่งเปา TrueMoney Wallet

เติมเงิน Truewallet ด้วยซองอั่งเปา

[![NPM version](https://img.shields.io/npm/v/@prakrit_m/tmn-voucher.svg?style=flat)](https://www.npmjs.org/package/@prakrit_m/tmn-voucher)
[![NPM Downloads](https://img.shields.io/npm/d18m/%40prakrit_m%2Ftmn-voucher)](https://www.npmjs.org/package/@prakrit_m/tmn-voucher)
![NPM Last Update](https://img.shields.io/npm/last-update/%40prakrit_m%2Ftmn-voucher)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## 🌟 Features

- ใช้งานง่ายและครอบคลุมฟีเจอร์ที่จำเป็น
- รองรับ TypeScript
- สามารถแลกคูปองได้เมื่อตรงตามเงื่อนไขที่กำหนด
- มีการตรวจสอบและ validate ข้อมูลก่อนการแลกคูปอง
- จัดการและแยกประเภท Error Code ได่ง่าย

## 🚀 Installation

ติดตั้งแพ็กเกจ:

```bash
# npm
npm install @prakrit_m/tmn-voucher

# yarn
yarn add @prakrit_m/tmn-voucher

# pnpm
pnpm add @prakrit_m/tmn-voucher
```

## 📖 Usage

นำเข้าฟังก์ชัน `redeemvouchers` และใช้มันเพื่อแลกคูปองซองอั่งเปา TrueMoney Wallet

```typescript
import redeemvouchers from "@prakrit_m/tmn-voucher";

// ตัวอย่างข้อมูลสำหรับแลกคูปอง
const phoneNumber = "0812345678";
const voucherUrl = "https://gift.truemoney.com/campaign/?v=YOUR_VOUCHER_CODE";

// ตัวเลือกเพิ่มเติมจะระบุหรือไม่ก็ได้ เช่น จำนวนเงิน
const options = {
  amount: 10000, // จำนวนเงินในหน่วยสตางค์ (100 บาท) กรณีที่ยอดเงินไม่ตรงจะไม่ทำการ redeem
};

// ใช้ Promises
function redeemWithPromise() {
  redeemvouchers(phoneNumber, voucherUrl, options)
    .then((response) => {
      if (response.success) {
        console.log(`🎉 แลกคูปองสำเร็จ: ${response.amount} สตางค์`);
      } else {
        handleVoucherError(response);
      }
    })
    .catch((error) => {
      console.error("❌ เกิดข้อผิดพลาดในการแลกคูปอง:", error);
    });
}

// ใช้ Async/Await
async function redeemWithAsync() {
  try {
    const response = await redeemvouchers(phoneNumber, voucherUrl, options);
    if (response.success) {
      console.log(`🎉 แลกคูปองสำเร็จ: ${response.amount} สตางค์`);
    } else {
      handleVoucherError(response);
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการแลกคูปอง:", error);
  }
}

// ฟังก์ชันจัดการ Error จากการแลกคูปอง
function handleVoucherError(response: { code: string; message: string }) {
  switch (response.code) {
    case "VOUCHER_NOT_FOUND":
      console.warn("🔍 ไม่พบคูปอง");
      break;
    case "VOUCHER_EXPIRED":
      console.warn("⏳ คูปองหมดอายุ");
      break;
    case "VOUCHER_OUT_OF_STOCK":
      console.warn("❌ คูปองถูกใช้ไปแล้ว");
      break;
    case "CANNOT_GET_OWN_VOUCHER":
      console.warn("🚫 ไม่สามารถใช้คูปองตัวเองได้");
      break;
    case "CONDITION_NOT_MET":
      console.warn("🚫 ไม่ตรงเงื่อนไข");
      break;
    default:
      console.warn(`⚠️ การแลกคูปองล้มเหลว: ${response.message}`);
  }
}

// เรียกใช้ฟังก์ชันตัวอย่าง
redeemWithPromise();
redeemWithAsync();
```

กรณีที่ไม่ได้ระบุพารามิเตอร์ options จะเป็นการ redeem โดยไม่เช็คเงื่อนไขใดๆก่อน

กรณีที่มีการระบุ options ถ้าไม่ตรงกับเงื่อนไขใดๆจะไม่ทำการ redeem

## 📚 API

### `redeemvouchers(phoneNumber: string, voucherUrl: string, options?: Options): Promise<ReturnData>`

แลกคูปอง TrueMoney

- `phoneNumber`: หมายเลขโทรศัพท์ที่เชื่อมโยงกับบัญชี TrueMoney ที่ต้องการรับเงิน
- `voucherUrl`: URL คูปองอั่งเปา
- `options`: เงื่อนไขเพิ่มเติม (ถ้ามี)
  - `amount`: จำนวนเงินที่ต้องการแลกในหน่วยสตางค์

คืนค่าเป็น Promise ที่ resolve เป็นวัตถุ `ReturnData`

### `Data`

```typescript
interface Data {
  voucher: Voucher;
  owner_profile: Profile;
  redeemer_profile: RedeemerProfile;
  my_ticket: MyTicket;
  tickets: MyTicket[];
}

interface Voucher {
  voucher_id: string;
  amount_baht: string;
  redeemed_amount_baht: string;
  member: number;
  status: "active" | "redeemed" | "expired";
  link: string;
  detail: string;
  expire_date: number;
  type: "R" | "F";
  redeemed: number;
  available: number;
}

interface Profile {
  full_name: string;
}

interface RedeemerProfile {
  mobile_number: string;
}

interface MyTicket {
  mobile: string;
  update_date: number;
  amount_baht: string;
  full_name: string;
  profile_pic: string | null;
}
```

`Data` ประกอบด้วยข้อมูลดังนี้:

- `voucher`: ข้อมูลคูปอง
- `owner_profile`: โปรไฟล์ของเจ้าของคูปอง
- `redeemer_profile`: โปรไฟล์ของผู่ที่จะแลกคูปอง
- `my_ticket`: ข้อมูลบัญชีของผู้รับเงินแล้ว
- `tickets`: รายการข้อมูลบัญชีของผู้รับเงินแล้ว

## 🛠️ Types

### `Options`

```typescript
type Options {
  amount: number; // จำนวนเงินในหน่วยสตางค์ 100-20000000
}
```

### `ReturnData`

```typescript
type ReturnData =
  | {
      // กรณี redeem สำเร็จ
      success: true;
      code: "SUCCESS";
      message: string; // ข้อความจาก TrueMoney
      amount: number; // จำนวนเงินเป็นสตางค์
      data: Data; // ข้อมูลจาก TrueMoney
    }
  | {
      // กรณี redeem ไม่สำเร็จ
      success: false;
      code: string;
      message: string; // ข้อความจาก TrueMoney
      data?: Data | null; // ข้อมูลจาก TrueMoney
    };
```

## 📋 Response Codes

| Code                          | Description                         | Success |
| ----------------------------- | ----------------------------------- | ------- |
| `SUCCESS`                     | สำเร็จ                              | true    |
| `BAD_PARAM`                   | พารามิเตอร์ไม่ถูกต้อง               | false   |
| `VOUCHER_NOT_FOUND`           | ไม่พบคูปอง                          | false   |
| `VOUCHER_OUT_OF_STOCK`        | คูปองถูกใช้ไปแล้ว                   | false   |
| `VOUCHER_EXPIRED`             | คูปองหมดอายุ                        | false   |
| `CANNOT_GET_OWN_VOUCHER`      | ไม่สามารถแลกคูปองของตัวเองได้       | false   |
| `TARGET_USER_NOT_FOUND`       | ไม่พบหมายเลขโทรศัพท์                | false   |
| `TARGET_USER_REDEEMED`        | ผู้ใช้นี้เคยแลกคูปองแล้ว            | false   |
| `TARGET_USER_STATUS_INACTIVE` | บัญชีผู้รับถูกระงับหรือไม่ได้ใช้งาน | false   |
| `CONDITION_NOT_MET`           | ไม่ตรงเงื่อนไข (options)            | false   |
| `INVALID_INPUT`               | ข้อมูลไม่ถูกต้อง                    | false   |
| `MAINTENANCE`                 | อยู่ในช่วงการบำรุงรักษา             | false   |
| `INTERNAL_ERROR`              | Internal server error               | false   |

## 📄 License

> This is a third-party SDK, not an official TrueMoney.  
> SDK นี้พัฒนาโดยบุคคลภายนอก ไม่ใช่ผลิตภัณฑ์อย่างเป็นทางการจาก TrueMoney

Licensed under [ISC](LICENSE)
