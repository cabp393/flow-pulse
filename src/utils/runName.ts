const onlyAlphaNum = /[^a-z0-9]/g;

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toTimestamp = (date: Date): string => {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}${pad2(date.getHours())}${pad2(date.getMinutes())}`;
};

const stripExtension = (name: string): string => {
  const safeName = String(name ?? '').trim();
  if (!safeName) return '';
  return safeName.replace(/\.[^.]+$/, '');
};

export const normalizeSlug = (input: string): string => {
  return input.toLowerCase().replace(/\s+/g, '').replace(onlyAlphaNum, '');
};

const safeSegment = (value: string | undefined, fallback: string): string => {
  const normalized = normalizeSlug(String(value ?? ''));
  return normalized || fallback;
};

export const buildRunName = (date: Date, layoutName: string, skuMasterName: string, xlsxFileName?: string): string => {
  const timestamp = toTimestamp(date);
  const layout = safeSegment(layoutName, 'layout');
  const skuMaster = safeSegment(skuMasterName, 'skumaster');
  const xlsx = safeSegment(stripExtension(xlsxFileName ?? 'xlsx'), 'xlsx');
  return `${timestamp}_${layout}_${skuMaster}_${xlsx}`;
};
