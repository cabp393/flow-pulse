import type { Layout, SkuMaster } from '../models/domain';
import { LayoutsPage } from './LayoutsPage';
import { SkuMasterPage } from './SkuMasterPage';

interface Props {
  section: 'layouts' | 'sku';
  onChangeSection: (section: 'layouts' | 'sku') => void;
  layoutsPage: {
    layouts: Layout[];
    activeLayoutId?: string;
    onCreate: () => void;
    onEdit: (layoutId: string) => void;
    onDuplicate: (layoutId: string) => void;
    onRename: (layoutId: string, name: string) => void;
    onDelete: (layoutId: string) => void;
    onSelect: (layoutId: string) => void;
    onExport: () => void;
    onExportOne: (layoutId: string) => void;
    onImport: (jsonPayload: string) => void;
  };
  skuPage: {
    layout?: Layout;
    masters: SkuMaster[];
    activeSkuMasterId?: string;
    onChange: (skuMasters: SkuMaster[], activeSkuMasterId?: string) => void;
    onImport: (csvPayload: string, layoutId?: string) => { ok: boolean; message: string };
    onExportOne: (skuMasterId: string) => void;
  };
}

export function AssetsPage({ section, onChangeSection, layoutsPage, skuPage }: Props) {
  return (
    <div className="page">
      <h2>Assets</h2>
      <div className="toolbar">
        <button className={section === 'layouts' ? 'active' : ''} onClick={() => onChangeSection('layouts')}>Layouts</button>
        <button className={section === 'sku' ? 'active' : ''} onClick={() => onChangeSection('sku')}>SKU Masters</button>
      </div>
      {section === 'layouts' && <LayoutsPage {...layoutsPage} />}
      {section === 'sku' && (skuPage.layout ? <SkuMasterPage {...skuPage} layout={skuPage.layout} /> : <p>Selecciona un layout para administrar SKU Masters.</p>)}
    </div>
  );
}
