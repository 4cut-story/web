/** k8s probe. 게이트웨이를 부르지 않는다 (web 자체가 떠 있는지만 본다). */
export function GET() {
  return Response.json({ status: "UP" });
}
