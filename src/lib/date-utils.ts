/**
 * 日期时间格式化工具函数
 * 解决unstable_cache序列化Date对象导致的显示问题
 */

/**
 * 安全格式化日期时间
 * @param value Date对象或ISO字符串
 * @returns 中文格式的日期时间字符串，24小时制
 */
export function formatDateTime(value: Date | string): string {
  try {
    // 安全转换：处理Date对象和ISO字符串
    const date = value instanceof Date ? value : new Date(value);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', value);
      return '无效日期';
    }
    
    // 中文格式，24小时制，避免AM/PM显示
    return date.toLocaleString('zh-CN', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  } catch (error) {
    console.error('Error formatting date:', error, 'value:', value);
    return '日期格式错误';
  }
}

/**
 * 安全转换为Date对象
 * @param value 任意值
 * @returns Date对象，无效时返回当前时间
 */
export function safeToDate(value: unknown): Date {
  try {
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    if (typeof value === 'number' && value > 0) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    console.warn('Cannot convert to Date, using current time:', value);
    return new Date();
  } catch (error) {
    console.error('Error converting to Date:', error, 'value:', value);
    return new Date();
  }
}