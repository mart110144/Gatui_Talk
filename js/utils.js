export const $ = (id) => document.getElementById(id);

// กัน XSS: ใช้กับข้อความจากผู้ใช้ทุกชิ้นที่ใส่ผ่าน innerHTML
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// เวลาแบบสัมพัทธ์ภาษาไทย
export function formatTimeThai(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

// localStorage แบบปลอดภัย (ไม่พังถ้าเบราว์เซอร์บล็อก)
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};
