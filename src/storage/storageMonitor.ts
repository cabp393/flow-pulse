export interface StorageUsage {
  usedBytes: number;
  quotaBytes?: number;
  usageRatio?: number;
  warning: boolean;
}

const WARNING_RATIO = 0.8;

const estimateLocalStorageBytes = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? '';
    total += (key.length + value.length) * 2;
  }
  return total;
};

export const getStorageUsage = async (): Promise<StorageUsage> => {
  const usedBytes = estimateLocalStorageBytes();

  if (!('storage' in navigator) || typeof navigator.storage.estimate !== 'function') {
    return {
      usedBytes,
      warning: usedBytes >= 4_000_000,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quotaBytes = estimate.quota;
    const usageRatio = quotaBytes ? usedBytes / quotaBytes : undefined;
    return {
      usedBytes,
      quotaBytes,
      usageRatio,
      warning: usageRatio ? usageRatio >= WARNING_RATIO : usedBytes >= 4_000_000,
    };
  } catch {
    return {
      usedBytes,
      warning: usedBytes >= 4_000_000,
    };
  }
};

export const formatStorageMegabytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
