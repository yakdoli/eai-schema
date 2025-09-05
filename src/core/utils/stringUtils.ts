// 문자열 처리 유틸리티

/**
 * 문자열을 카멜케이스로 변환
 */
export const toCamelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * 문자열을 파스칼케이스로 변환
 */
export const toPascalCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * 문자열을 케밥케이스로 변환
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * 문자열을 스네이크케이스로 변환
 */
export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

/**
 * 문자열 첫 글자를 대문자로 변환
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * 각 단어의 첫 글자를 대문자로 변환
 */
export const titleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * 문자열 앞뒤 공백 제거 및 내부 공백 정리
 */
export const normalizeWhitespace = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * 문자열에서 HTML 태그 제거
 */
export const stripHtml = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * 문자열 자르기 (말줄임표 추가)
 */
export const truncate = (str: string, maxLength: number, suffix = '...'): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * 단어 단위로 문자열 자르기
 */
export const truncateWords = (str: string, maxWords: number, suffix = '...'): string => {
  const words = str.split(/\s+/);
  if (words.length <= maxWords) {
    return str;
  }
  return words.slice(0, maxWords).join(' ') + suffix;
};

/**
 * 문자열에서 특정 패턴 추출
 */
export const extractPattern = (str: string, pattern: RegExp): string[] => {
  const matches = str.match(pattern);
  return matches || [];
};

/**
 * 이메일 주소에서 도메인 추출
 */
export const extractEmailDomain = (email: string): string => {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : '';
};

/**
 * URL에서 도메인 추출
 */
export const extractUrlDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

/**
 * 문자열을 슬러그로 변환 (URL 친화적)
 */
export const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, ''); // 앞뒤 하이픈 제거
};

/**
 * 랜덤 문자열 생성
 */
export const generateRandomString = (
  length: number,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * 문자열 유사도 계산 (레벤슈타인 거리)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // 초기화
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 계산
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // 삭제
        matrix[i][j - 1] + 1,     // 삽입
        matrix[i - 1][j - 1] + cost // 치환
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
};

/**
 * 문자열 마스킹 (개인정보 보호)
 */
export const maskString = (str: string, visibleStart = 2, visibleEnd = 2, maskChar = '*'): string => {
  if (str.length <= visibleStart + visibleEnd) {
    return maskChar.repeat(str.length);
  }
  
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const middle = maskChar.repeat(str.length - visibleStart - visibleEnd);
  
  return start + middle + end;
};

/**
 * 이메일 마스킹
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!domain) {return maskString(email);}
  
  const maskedLocal = maskString(localPart, 1, 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * 전화번호 마스킹
 */
export const maskPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) {return maskString(phone);}
  
  return maskString(cleaned, 3, 4);
};

/**
 * 문자열을 바이트 배열로 변환
 */
export const stringToBytes = (str: string): number[] => {
  return Array.from(Buffer.from(str, 'utf8'));
};

/**
 * 바이트 배열을 문자열로 변환
 */
export const bytesToString = (bytes: number[]): string => {
  return Buffer.from(bytes).toString('utf8');
};

/**
 * 문자열 압축 (간단한 RLE)
 */
export const compressString = (str: string): string => {
  let compressed = '';
  let count = 1;
  
  for (let i = 0; i < str.length; i++) {
    if (i + 1 < str.length && str[i] === str[i + 1]) {
      count++;
    } else {
      compressed += count > 1 ? `${count}${str[i]}` : str[i];
      count = 1;
    }
  }
  
  return compressed.length < str.length ? compressed : str;
};

/**
 * 문자열 해제 (RLE 압축 해제)
 */
export const decompressString = (compressed: string): string => {
  let decompressed = '';
  let i = 0;
  
  while (i < compressed.length) {
    if (/\d/.test(compressed[i])) {
      const count = parseInt(compressed[i]);
      const char = compressed[i + 1];
      decompressed += char.repeat(count);
      i += 2;
    } else {
      decompressed += compressed[i];
      i++;
    }
  }
  
  return decompressed;
};

/**
 * 문자열에서 숫자만 추출
 */
export const extractNumbers = (str: string): string => {
  return str.replace(/\D/g, '');
};

/**
 * 문자열에서 문자만 추출
 */
export const extractLetters = (str: string): string => {
  return str.replace(/[^a-zA-Z]/g, '');
};

/**
 * 문자열 역순
 */
export const reverseString = (str: string): string => {
  return str.split('').reverse().join('');
};