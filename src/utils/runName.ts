const onlyAlphaNum = /[^a-z0-9]/g;

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toTimestamp = (date: Date): string => {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}${pad2(date.getHours())}${pad2(date.getMinutes())}`;
};

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, '');

export const normalizeSlug = (input: string): string => {
  return input.toLowerCase().replace(/\s+/g, '').replace(onlyAlphaNum, '');
};

export const buildRunName = (date: Date, layoutName: string, skuMasterName: string, xlsxFileName: string): string => {
  const timestamp = toTimestamp(date);
  const layout = normalizeSlug(layoutName);
  const skuMaster = normalizeSlug(skuMasterName);
  const xlsx = normalizeSlug(stripExtension(xlsxFileName));
  return `${timestamp}_${layout}_${skuMaster}_${xlsx}`;
};
