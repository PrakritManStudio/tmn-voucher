import { BASE_URL } from "./constants";
import type { MaintenanceResponse } from "./types";

export async function checkMaintenance(): Promise<MaintenanceResponse> {
  const response = await fetch(BASE_URL + "/campaign/vouchers/configuration");
  const data = await response.json();

  if (data?.status?.code === "SUCCESS") {
    return {
      success: true,
      code: "SUCCESS",
    };
  }

  console.log("!ทรูมันนี่ปิดปรับปรุงระบบ");
  return {
    success: false,
    code: "MAINTEINANCE",
    message: data.data.ma.title_th,
  };
}
