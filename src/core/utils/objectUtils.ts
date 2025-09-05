// 객체 처리 유틸리티

/**
 * 깊은 복사
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
};

/**
 * 객체 병합 (깊은 병합)
 */
export const deepMerge = <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
};

/**
 * 객체인지 확인
 */
export const isObject = (item: any): item is Record<string, any> => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * 빈 객체인지 확인
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  return Object.keys(obj).length === 0;
};

/**
 * 객체에서 특정 키들만 선택
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * 객체에서 특정 키들 제외
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

/**
 * 중첩된 객체에서 값 가져오기
 */
export const getNestedValue = (obj: any, path: string, defaultValue?: any): any => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
};

/**
 * 중첩된 객체에 값 설정
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
};

/**
 * 객체의 키-값 쌍을 배열로 변환
 */
export const objectToEntries = <T>(obj: Record<string, T>): [string, T][] => {
  return Object.entries(obj);
};

/**
 * 배열을 객체로 변환
 */
export const entriesToObject = <T>(entries: [string, T][]): Record<string, T> => {
  return Object.fromEntries(entries);
};

/**
 * 객체의 키들을 변환
 */
export const transformKeys = <T>(
  obj: Record<string, T>,
  transformer: (key: string) => string
): Record<string, T> => {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[transformer(key)] = value;
  }
  return result;
};

/**
 * 객체의 값들을 변환
 */
export const transformValues = <T, U>(
  obj: Record<string, T>,
  transformer: (value: T, key: string) => U
): Record<string, U> => {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = transformer(value, key);
  }
  return result;
};

/**
 * 객체 필터링
 */
export const filterObject = <T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> => {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value, key)) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * 객체 평탄화
 */
export const flattenObject = (
  obj: Record<string, any>,
  prefix: string = '',
  separator: string = '.'
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;
    
    if (isObject(value) && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey, separator));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
};

/**
 * 평탄화된 객체를 중첩 객체로 변환
 */
export const unflattenObject = (
  obj: Record<string, any>,
  separator: string = '.'
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    setNestedValue(result, key.replace(new RegExp(`\\${separator}`, 'g'), '.'), value);
  }
  
  return result;
};

/**
 * 객체 비교 (깊은 비교)
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) {
    return true;
  }
  
  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }
  
  if (typeof obj1 !== typeof obj2) {
    return false;
  }
  
  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }
    
    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
};

/**
 * 객체에서 null/undefined 값 제거
 */
export const removeNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      result[key as keyof T] = value;
    }
  }
  
  return result;
};

/**
 * 객체에서 빈 값 제거 (null, undefined, 빈 문자열, 빈 배열, 빈 객체)
 */
export const removeEmpty = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (!isEmpty(value)) {
      result[key as keyof T] = value;
    }
  }
  
  return result;
};

/**
 * 객체 크기 계산 (대략적인 메모리 사용량)
 */
export const getObjectSize = (obj: any): number => {
  let size = 0;
  
  const calculateSize = (item: any): void => {
    if (item === null || item === undefined) {
      size += 4; // null/undefined 포인터
    } else if (typeof item === 'boolean') {
      size += 4;
    } else if (typeof item === 'number') {
      size += 8;
    } else if (typeof item === 'string') {
      size += item.length * 2; // UTF-16
    } else if (Array.isArray(item)) {
      size += 4; // 배열 헤더
      item.forEach(calculateSize);
    } else if (typeof item === 'object') {
      size += 4; // 객체 헤더
      Object.keys(item).forEach(key => {
        size += key.length * 2; // 키 크기
        calculateSize(item[key]);
      });
    }
  };
  
  calculateSize(obj);
  return size;
};

/**
 * 객체를 쿼리 스트링으로 변환
 */
export const objectToQueryString = (obj: Record<string, any>): string => {
  const params = new URLSearchParams();
  
  const addParam = (key: string, value: any): void => {
    if (value != null) {
      if (Array.isArray(value)) {
        value.forEach(item => addParam(key, item));
      } else {
        params.append(key, String(value));
      }
    }
  };
  
  Object.entries(obj).forEach(([key, value]) => {
    addParam(key, value);
  });
  
  return params.toString();
};