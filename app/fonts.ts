import localFont from "next/font/local";

// Pretendard Variable (OFL-1.1). 자체 호스팅하고 외부 CDN을 부르지 않는다.
export const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});
