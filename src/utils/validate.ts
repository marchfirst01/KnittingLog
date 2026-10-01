/** 로그인 아이디·계정 ID 공통 규칙: 영문 소문자, 숫자, _ . 4~20자 */
export const ID_RE = /^[a-z0-9_.]{4,20}$/;
export const ID_RULE = '영문 소문자, 숫자, _ . 만 사용해 4~20자로 입력해 주세요.';
export const normalizeId = (s: string) => s.trim().toLowerCase().replace(/^@/, '');
