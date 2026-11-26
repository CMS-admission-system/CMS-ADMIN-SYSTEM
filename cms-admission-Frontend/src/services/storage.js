const defaultStorage = {
  cmsAuth: { role: null, username: null },
  cmsDraftApplication: null,
  cmsApplications: [],
  cmsBackgroundSettings: {
    enabled: true,
    videoDataUrl: '',
    videoMimeType: '',
    playbackMode: 'muted',
  },
  cmsPaymentSettings: {
    feeAmount: '',
    upiId: 'cms@bank',
    paymentQrs: [null, null],
    feeStructure: null,
  },
  cmsLastSubmittedApplication: null,
  cmsCorrectionHistory: [],
  cmsBusRoutesConfig: null,
};

export const STORAGE_KEYS = Object.keys(defaultStorage).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

export function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    const parsed = JSON.parse(value);

    // Sanitize applications array to prevent null-item crashes
    if (key === STORAGE_KEYS.cmsApplications) {
      if (!Array.isArray(parsed)) return Array.isArray(fallback) ? fallback : [];
      return parsed.filter((item) => item && typeof item === 'object' && (item.id || item.formNumber));
    }

    // Sanitize payment settings structure
    if (key === STORAGE_KEYS.cmsPaymentSettings && parsed && typeof parsed === 'object') {
      return {
        ...parsed,
        upiId: parsed.upiId ?? 'cms@bank',
        paymentQrs: Array.isArray(parsed.paymentQrs)
          ? parsed.paymentQrs
          : [parsed.paymentQr || null, null],
      };
    }

    return parsed;
  } catch (error) {
    console.warn(`Unable to read storage key ${key}:`, error);
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write storage key ${key}:`, error);
  }
}

export function clearStorageKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to clear storage key ${key}:`, error);
  }
}

export function getDefaultStorage() {
  return JSON.parse(JSON.stringify(defaultStorage));
}

export function resetStorage() {
  Object.entries(defaultStorage).forEach(([key, value]) => {
    writeStorage(key, value);
  });
}
