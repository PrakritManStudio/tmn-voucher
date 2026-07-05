# Changelog

รายการเปลี่ยนแปลงทั้งหมดของโปรเจคนี้จะถูกบันทึกไว้ในไฟล์นี้

รูปแบบการเขียนอ้างอิงจาก [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
และโปรเจคนี้ยึดตาม [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-05

### เพิ่มเติม
- เพิ่ม `TmnVoucherClient` และ `createTmnVoucherClient` เป็น public API หลักของ SDK
- เพิ่ม `validateInput()`, `extractVoucherCode()` และ `client.validateInput()` สำหรับตรวจ input โดยไม่เรียก API พร้อมรายละเอียด `issues` จาก Zod ทุกจุดที่ไม่ถูกต้อง
- เพิ่มการตั้งค่า `baseApiUrl`, `userAgent`, `headers`, `fetch` และ `timeoutMs` ต่อ client instance
- เพิ่ม `checkServerStatus()` สำหรับตรวจสอบสถานะ server และ maintenance
- เพิ่ม `verifyVoucher()` สำหรับตรวจสอบ voucher โดยไม่ redeem
- เพิ่ม `pnpm run test:live` สำหรับทดสอบกับ voucher และเบอร์จริง โดย dry-run จะไม่ redeem และต้อง opt-in ด้วย `TMN_LIVE_REDEEM=YES_REDEEM_REAL_VOUCHERS` ก่อน redeem จริง
- เพิ่ม result codes ฝั่ง SDK เช่น `INVALID_INPUT`, `NETWORK_ERROR`, `TIMEOUT`, `INVALID_RESPONSE`, `MAINTENANCE` และ `CONDITION_NOT_MET`
- เพิ่ม test ด้วย mock fetch ครอบ flow หลัก รวม voucher แบบ random (R) และ fixed (F)
- เพิ่ม JSDoc ใน `TmnVoucherClient` และ export ไปใน declaration files

### เปลี่ยนแปลง
- ปรับโครงสร้างภายในเป็น client, config, transport, validators, voucher rules และ types
- ปรับ `checkServerStatus()` ให้คืน `MAINTENANCE` เมื่อ `status.code` เป็น `MAINTENANCE` หรือ `data.ma` มีข้อความใน `title_th`, `title_en`, `message_th`, `message_en`
- transport ตรวจ HTTP status (`!response.ok`) ก่อน parse JSON และคืน `INVALID_RESPONSE`
- เปรียบเทียบ `options.amount` (สตางค์) แบบ unified ทุกประเภท voucher
- เก็บ response types จาก TrueMoney API ตามเดิม (snake_case) ไม่แปลง domain model
- `options.amount` และ `redeemVoucher` result ใช้หน่วยสตางค์ (integer)
- ทุก method คืน result object เสมอสำหรับ validation, network, timeout และ API error
- อัปเดต README ภาษาไทยสำหรับ API v2, migration guide และเอกสาร exports
- ปรับ package version เป็น `2.0.0` และเพิ่ม `exports` map สำหรับ ESM/CJS

### Breaking Changes
- ลบ default export เดิม `redeemvouchers(...)`
- เปลี่ยนการใช้งานหลักเป็น `new TmnVoucherClient().redeemVoucher(...)`
- แก้รหัส maintenance จาก `MAINTEINANCE` เป็น `MAINTENANCE`

## [1.0.5] - 2024-03-20

### เพิ่มเติม
- เพิ่ม CHANGELOG.md เพื่อติดตามการเปลี่ยนแปลง
- เพิ่มการรองรับ TypeScript อย่างสมบูรณ์

### แก้ไข
- ปรับปรุงเอกสารประกอบการใช้งาน
- แก้ไขการตรวจสอบ URL pattern ให้ครอบคลุมมากขึ้น

### เปลี่ยนแปลง
- ปรับโครงสร้างโค้ดให้เป็นระเบียบมากขึ้น
- อัพเดท dependencies เป็นเวอร์ชันล่าสุด

## [1.0.4] - 2024-03-19

### เพิ่มเติม
- เพิ่มการตรวจสอบ URL ที่รองรับรูปแบบ URL ที่หลากหลายขึ้น
- เพิ่มการตรวจสอบเงื่อนไขสำหรับซองอั่งเปาแบบสุ่มและแบ่งเท่า

### แก้ไข
- ปรับปรุงข้อความแจ้งเตือนให้เป็นภาษาไทย
- แก้ไขการตรวจสอบ maintenance mode

### เปลี่ยนแปลง
- ปรับโครงสร้างโค้ดให้เป็นระเบียบมากขึ้น
- อัพเดท dependencies เป็นเวอร์ชันล่าสุด

## [1.0.3] - 2024-03-15

### เพิ่มเติม
- เพิ่มฟีเจอร์ตรวจสอบจำนวนเงินก่อนแลกคูปอง
- เพิ่มการ validate input

### แก้ไข
- แก้ไขบัคการแปลงหน่วยเงินบาท/สตางค์

## [1.0.2] - 2024-03-10

### เพิ่มเติม
- เพิ่มการรองรับ TypeScript
- เพิ่มเอกสารประกอบการใช้งาน

## [1.0.1] - 2024-03-05

### แก้ไข
- แก้ไขบัคการเชื่อมต่อ API
- ปรับปรุงข้อความ error

## [1.0.0] - 2024-03-01

### เพิ่มเติม
- เปิดตัวครั้งแรก
- ฟีเจอร์พื้นฐานสำหรับการแลกคูปอง TrueMoney 
