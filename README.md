# @prakrit_m/tmn-voucher

ไลบรารี TypeScript สำหรับการแลกคูปองอั่งเปา TrueMoney Wallet

## Installation

ติดตั้งแพ็กเกจโดยใช้ npm:

```bash
npm install @prakrit_m/tmn-voucher
```

## Usage

นำเข้าฟังก์ชัน `redeemvouchers` และใช้มันเพื่อแลกคูปองซองอั่งเปา TrueMoney Wallet

```typescript
import redeemvouchers from "@prakrit_m/tmn-voucher";

const phoneNumber = "0812345678";
const voucherUrl = "https://gift.truemoney.com/campaign/?v=YOUR_VOUCHER_CODE";
const options = {
  amount: 10000, // จำนวนเงินในหน่วยสตางค์
};

// Using Promises
redeemvouchers(phoneNumber, voucherUrl, options)
  .then((response) => {
    if (response.success) {
      console.log("แลกคูปองสำเร็จ:", response.data);
    } else {
      console.log("การแลกคูปองล้มเหลว:", response.message);
    }
  })
  .catch((error) => {
    console.error("เกิดข้อผิดพลาดในการแลกคูปอง:", error);
  });

// Using Async/Await
async function redeemVoucherAsync() {
  try {
    const response = await redeemvouchers(phoneNumber, voucherUrl, options);
    if (response.success) {
      console.log("แลกคูปองสำเร็จ:", response.data);
    } else {
      console.log("การแลกคูปองล้มเหลว:", response.message);
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการแลกคูปอง:", error);
  }
}

redeemVoucherAsync();
```

กรณีที่ไม่ได้ระบุพารามิเตอร์ options จะเป็นการ redeem โดยไม่เช็คเงื่อนไขใดๆ

## API

### `redeemvouchers(phoneNumber: string, voucherUrl: string, options?: Options): Promise<ReturnData>`

แลกคูปอง TrueMoney

- `phoneNumber`: หมายเลขโทรศัพท์ที่เชื่อมโยงกับบัญชี TrueMoney ที่ต้องการรับเงิน
- `voucherUrl`: URL คูปองอั่งเปา
- `options`: เงื่อนไขเพิ่มเติม (ถ้ามี)
  - `amount`: จำนวนเงินที่ต้องการแลกในหน่วยสตางค์

คืนค่าเป็น Promise ที่ resolve เป็นวัตถุ `ReturnData`

## Types

### `Options`

```typescript
interface Options {
  amount: number; // จำนวนเงินในหน่วยสตางค์
}
```

### `ReturnData`

```typescript
interface ReturnData {
  success: boolean;
  code: string;
  message: string;
  data?: any;
}
```

## Response Codes

| Code                     | Description                   | Success |
| ------------------------ | ----------------------------- | ------- |
| `SUCCESS`                | สำเร็จ                        | true    |
| `BAD_PARAM`              | พารามิเตอร์ไม่ถูกต้อง         | false   |
| `VOUCHER_NOT_FOUND`      | ไม่พบคูปอง                    | false   |
| `VOUCHER_OUT_OF_STOCK`   | คูปองถูกใช้ไปแล้ว             | false   |
| `VOUCHER_EXPIRED`        | คูปองหมดอายุ                  | false   |
| `CANNOT_GET_OWN_VOUCHER` | ไม่สามารถแลกคูปองของตัวเองได้ | false   |
| `TARGET_USER_NOT_FOUND`  | ไม่พบผู้ใช้เป้าหมาย           | false   |
| `TARGET_USER_REDEEMED`   | ผู้ใช้เป้าหมายได้แลกคูปองแล้ว | false   |
| `CONDITION_NOT_MET`      | ไม่ตรงเงื่อนไข (options)      | false   |
| `INVALID_INPUT`          | ข้อมูลไม่ถูกต้อง              | false   |
| `MAINTENANCE`            | อยู่ในช่วงการบำรุงรักษา       | false   |

## License

MIT
