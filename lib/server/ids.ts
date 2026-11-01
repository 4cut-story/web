/**
 * 서비스가 밖에 내보내는 ID 형식 (NanoID, 21자, A-Za-z0-9_-). DB의 내부 번호는 밖에 나오지 않는다.
 * 경로에 들어온 값을 게이트웨이에 넘기기 전에 거른다.
 */
const PUBLIC_ID = /^[A-Za-z0-9_-]{21}$/;

export function isPublicId(value: string): boolean {
  return PUBLIC_ID.test(value);
}
