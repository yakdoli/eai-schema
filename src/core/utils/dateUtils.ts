// 날짜 및 시간 유틸리티

/**
 * 현재 ISO 문자열 반환
 */
export const getCurrentISOString = (): string => {
  return new Date().toISOString();
};

/**
 * 날짜를 ISO 문자열로 변환
 */
export const toISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * ISO 문자열을 Date 객체로 변환
 */
export const fromISOString = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * 시간 포맷팅 (HH:MM:SS)
 */
export const formatTime = (date: Date): string => {
  return date.toTimeString().split(' ')[0];
};

/**
 * 날짜시간 포맷팅 (YYYY-MM-DD HH:MM:SS)
 */
export const formatDateTime = (date: Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

/**
 * 상대적 시간 표시 (예: "2시간 전")
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return '방금 전';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}주 전`;
  } else if (diffMonths < 12) {
    return `${diffMonths}개월 전`;
  } else {
    return `${diffYears}년 전`;
  }
};

/**
 * 두 날짜 간의 차이 계산 (밀리초)
 */
export const getTimeDifference = (date1: Date, date2: Date): number => {
  return Math.abs(date1.getTime() - date2.getTime());
};

/**
 * 두 날짜 간의 차이 계산 (일)
 */
export const getDaysDifference = (date1: Date, date2: Date): number => {
  const diffMs = getTimeDifference(date1, date2);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * 날짜에 일수 추가
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 날짜에 시간 추가
 */
export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * 날짜에 분 추가
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * 날짜가 오늘인지 확인
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDate(date) === formatDate(today);
};

/**
 * 날짜가 어제인지 확인
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = addDays(new Date(), -1);
  return formatDate(date) === formatDate(yesterday);
};

/**
 * 날짜가 이번 주인지 확인
 */
export const isThisWeek = (date: Date): boolean => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
};

/**
 * 날짜가 이번 달인지 확인
 */
export const isThisMonth = (date: Date): boolean => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && 
         date.getMonth() === now.getMonth();
};

/**
 * 날짜가 올해인지 확인
 */
export const isThisYear = (date: Date): boolean => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear();
};

/**
 * 월의 첫 번째 날 반환
 */
export const getFirstDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * 월의 마지막 날 반환
 */
export const getLastDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * 주의 첫 번째 날 반환 (월요일)
 */
export const getFirstDayOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * 주의 마지막 날 반환 (일요일)
 */
export const getLastDayOfWeek = (date: Date): Date => {
  const firstDay = getFirstDayOfWeek(date);
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999);
  return lastDay;
};

/**
 * 타임존 변환
 */
export const convertTimezone = (date: Date, timezone: string): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
};

/**
 * UTC 시간으로 변환
 */
export const toUTC = (date: Date): Date => {
  return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
};

/**
 * 로컬 시간으로 변환
 */
export const toLocal = (utcDate: Date): Date => {
  return new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
};

/**
 * 날짜 범위 생성
 */
export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * 업무일인지 확인 (월-금)
 */
export const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

/**
 * 주말인지 확인 (토-일)
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};