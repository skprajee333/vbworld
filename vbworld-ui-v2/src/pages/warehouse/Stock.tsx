
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustStock,
  createItem,
  downloadWarehouseStockImportTemplate,
  exportWarehouseStock,
  getCategories,
  getItems,
  getLowStock,
  getStock,
  getWarehouseAdjustments,
  getWarehouseLots,
  getWarehouseReceipts,
  getWarehouseWastageLog,
  importWarehouseStock,
  pushToast,
  receiveStock,
  updateItem,
  updateStock,
} from '../../api'
import { Download, Edit3, Loader2, Plus, Scale, Search, Upload, X } from 'lucide-react'

type Tab = 'stock' | 'items' | 'low' | 'receipts' | 'lots' | 'adjustments' | 'wastage'

type StockRow = {
  itemId: string
  itemName: string
  itemCode: string
  unit: string
  categoryName?: string
  quantity: number
  minLevel: number
  lowStock: boolean
  updatedAt?: string
}

type ItemRow = {
  id: number
  code: string
  name: string
  unit: string
  reorderLevel: number
  active: boolean
  categoryName?: string
}

type ReceiptRow = {
  id: string
  itemName: string
  itemCode: string
  quantityReceived: number
  baseQuantityReceived?: number
  receivedUom?: string
  unitsPerPack?: number
  batchNumber?: string
  expiryDate?: string
  supplierName?: string
  referenceNumber?: string
  unitCost?: number
  notes?: string
  receivedByName?: string
  receivedAt?: string
}

type AdjustmentRow = {
  id: string
  itemName: string
  itemCode: string
  adjustmentType: 'INCREASE' | 'DECREASE' | 'SET_COUNT'
  reasonType?: 'GENERAL' | 'WASTAGE' | 'SPOILAGE' | 'EXPIRED' | 'DAMAGE' | 'DEAD_STOCK' | 'STOCK_AUDIT'
  impactType?: 'GENERAL' | 'WASTAGE' | 'DEAD_STOCK'
  lotId?: string
  batchNumber?: string
  quantityBefore: number
  quantityAfter: number
  quantityDelta: number
  quantityValue: number
  reason: string
  notes?: string
  adjustedByName?: string
  adjustedAt?: string
}

type LotRow = {
  id: string
  itemName: string
  itemCode: string
  category?: string
  stockUnit: string
  receivedUom?: string
  unitsPerPack?: number
  quantityReceived: number
  baseQuantityReceived: number
  remainingQuantity: number
  batchNumber?: string
  expiryDate?: string
  lotStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED'
  supplierName?: string
  receivedAt?: string
}

type CategoryOption = { id: number; name: string }

type ItemFormState = {
  code: string
  name: string
  unit: string
  categoryId: string
  reorderLevel: string
}

type StockImportResult = {
  processedRows: number
  updatedRows: number
  skippedRows: number
  errors?: string[]
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      {children}
    </label>
  )
}

function ModalActions({ onClose, onSubmit, loading, submitText, disabled }: { onClose: () => void; onSubmit: () => void; loading?: boolean; submitText: string; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
      <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
      <button disabled={disabled || loading} onClick={onSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled || loading ? 0.6 : 1 }}>
        {loading && <Loader2 size={14} className="spin" />}
        {submitText}
      </button>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatQty(value?: number) {
  if (value == null || Number.isNaN(value)) return '-'
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function downloadBlob(data: BlobPart, fileName: string, type: string) {
  const blob = new Blob([data], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

export default function WarehouseStock() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('stock')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<number | undefined>()
  const [editStock, setEditStock] = useState<StockRow | null>(null)
  const [receiveFor, setReceiveFor] = useState<StockRow | null>(null)
  const [adjustFor, setAdjustFor] = useState<StockRow | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editItem, setEditItem] = useState<ItemRow | null>(null)
  const [stockForm, setStockForm] = useState({ quantity: '', minLevel: '', notes: '' })
  const [receiveForm, setReceiveForm] = useState({ quantityReceived: '', receivedUom: '', unitsPerPack: '1', batchNumber: '', expiryDate: '', supplierName: '', referenceNumber: '', unitCost: '', notes: '' })
  const [adjustForm, setAdjustForm] = useState({ adjustmentType: 'DECREASE', reasonType: 'GENERAL', lotId: '', quantityValue: '', reason: '', notes: '' })
  const [itemForm, setItemForm] = useState<ItemFormState>({ code: '', name: '', unit: 'Kg', categoryId: '', reorderLevel: '10' })
  const [importResult, setImportResult] = useState<StockImportResult | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const { data: allStock = [], isLoading: stockLoading } = useQuery({ queryKey: ['stock', search], queryFn: () => getStock(search || undefined), select: (r: any) => r.data.data || [] })
  const { data: lowStock = [], isLoading: lowLoading } = useQuery({ queryKey: ['lowstock'], queryFn: getLowStock, select: (r: any) => r.data.data || [] })
  const { data: receipts = [], isLoading: receiptsLoading } = useQuery({ queryKey: ['receipts', search], queryFn: () => getWarehouseReceipts(search || undefined), select: (r: any) => r.data.data || [] })
  const { data: lots = [], isLoading: lotsLoading } = useQuery({ queryKey: ['lots', search], queryFn: () => getWarehouseLots({ search: search || undefined }), select: (r: any) => r.data.data || [] })
  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({ queryKey: ['adjustments', search], queryFn: () => getWarehouseAdjustments(search || undefined), select: (r: any) => r.data.data || [] })
  const { data: wastageLog = [], isLoading: wastageLoading } = useQuery({ queryKey: ['wastage-log'], queryFn: getWarehouseWastageLog, select: (r: any) => r.data.data || [] })
  const { data: items = [], isLoading: itemsLoading } = useQuery({ queryKey: ['items', search, catFilter], queryFn: () => getItems({ search, categoryId: catFilter, size: 50 }), select: (r: any) => r.data.data?.content || [] })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories, select: (r: any) => r.data.data || [] })

  const refreshWarehouseData = () => {
    qc.invalidateQueries({ queryKey: ['stock'] })
    qc.invalidateQueries({ queryKey: ['lowstock'] })
    qc.invalidateQueries({ queryKey: ['receipts'] })
    qc.invalidateQueries({ queryKey: ['lots'] })
    qc.invalidateQueries({ queryKey: ['adjustments'] })
    qc.invalidateQueries({ queryKey: ['wastage-log'] })
    qc.invalidateQueries({ queryKey: ['items'] })
  }

  const doUpdateStock = useMutation({ mutationFn: () => updateStock(editStock!.itemId, { quantity: stockForm.quantity ? parseFloat(stockForm.quantity) : undefined, minLevel: stockForm.minLevel ? parseFloat(stockForm.minLevel) : undefined, notes: stockForm.notes || undefined }), onSuccess: () => { refreshWarehouseData(); setEditStock(null) } })
  const doReceiveStock = useMutation({ mutationFn: () => receiveStock(receiveFor!.itemId, { quantityReceived: parseFloat(receiveForm.quantityReceived), receivedUom: receiveForm.receivedUom || undefined, unitsPerPack: receiveForm.unitsPerPack ? parseFloat(receiveForm.unitsPerPack) : undefined, batchNumber: receiveForm.batchNumber || undefined, expiryDate: receiveForm.expiryDate || undefined, supplierName: receiveForm.supplierName || undefined, referenceNumber: receiveForm.referenceNumber || undefined, unitCost: receiveForm.unitCost ? parseFloat(receiveForm.unitCost) : undefined, notes: receiveForm.notes || undefined }), onSuccess: () => { refreshWarehouseData(); setReceiveFor(null); setReceiveForm({ quantityReceived: '', receivedUom: '', unitsPerPack: '1', batchNumber: '', expiryDate: '', supplierName: '', referenceNumber: '', unitCost: '', notes: '' }); setTab('lots') } })
  const doAdjustStock = useMutation({ mutationFn: () => adjustStock(adjustFor!.itemId, { adjustmentType: adjustForm.adjustmentType, reasonType: adjustForm.reasonType, lotId: adjustForm.lotId || undefined, quantityValue: parseFloat(adjustForm.quantityValue), reason: adjustForm.reason, notes: adjustForm.notes || undefined }), onSuccess: () => { const nextTab = adjustForm.reasonType === 'GENERAL' ? 'adjustments' : 'wastage'; refreshWarehouseData(); setAdjustFor(null); setAdjustForm({ adjustmentType: 'DECREASE', reasonType: 'GENERAL', lotId: '', quantityValue: '', reason: '', notes: '' }); setTab(nextTab as Tab) } })
  const doCreateItem = useMutation({ mutationFn: () => createItem({ ...itemForm, categoryId: itemForm.categoryId ? Number(itemForm.categoryId) : undefined, reorderLevel: parseFloat(itemForm.reorderLevel) }), onSuccess: () => { refreshWarehouseData(); setShowAddItem(false); setItemForm({ code: '', name: '', unit: 'Kg', categoryId: '', reorderLevel: '10' }); setTab('items') } })
  const doUpdateItem = useMutation({ mutationFn: () => updateItem(String(editItem!.id), { name: editItem!.name, unit: editItem!.unit, reorderLevel: parseFloat(String(editItem!.reorderLevel)), active: editItem!.active }), onSuccess: () => { refreshWarehouseData(); setEditItem(null) } })
  const doImportStockWorkbook = useMutation({
    mutationFn: (file: File) => importWarehouseStock(file),
    onSuccess: (response: any) => {
      const result = (response.data.data || null) as StockImportResult | null
      setImportResult(result)
      refreshWarehouseData()
      setTab('stock')
      const errorCount = result?.errors?.length || 0
      pushToast({
        tone: errorCount > 0 ? 'warning' : 'success',
        title: errorCount > 0 ? 'Import completed with warnings' : 'Stock imported',
        message: errorCount > 0
          ? `Updated ${result?.updatedRows || 0} row(s). ${errorCount} row(s) need review.`
          : `Updated ${result?.updatedRows || 0} stock row(s) successfully.`,
      })
    },
  })

  async function handleExportStock() {
    const response = await exportWarehouseStock()
    downloadBlob(response.data, 'warehouse-stock.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  async function handleDownloadTemplate() {
    const response = await downloadWarehouseStockImportTemplate()
    downloadBlob(response.data, 'warehouse-stock-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportResult(null)
    doImportStockWorkbook.mutate(file)
    event.target.value = ''
  }

  const displayStock = tab === 'low' ? lowStock : allStock
  const activeCount = tab === 'stock' ? allStock.length : tab === 'low' ? lowStock.length : tab === 'receipts' ? receipts.length : tab === 'lots' ? lots.length : tab === 'adjustments' ? adjustments.length : tab === 'wastage' ? wastageLog.length : items.length

  return (
    <div style={{ maxWidth: 1120 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Stock Manager</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Warehouse controls for stock, inward receipts, adjustments, and item catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(tab === 'stock' || tab === 'low') && (
            <>
              <input ref={importInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFileChange} style={{ display: 'none' }} />
              <button onClick={handleExportStock} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Download size={14} /> Download Stock</button>
              <button onClick={handleDownloadTemplate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Download size={14} /> Import Template</button>
              <button onClick={() => importInputRef.current?.click()} disabled={doImportStockWorkbook.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: doImportStockWorkbook.isPending ? 'not-allowed' : 'pointer', opacity: doImportStockWorkbook.isPending ? 0.7 : 1 }}>
                {doImportStockWorkbook.isPending ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Import Excel
              </button>
            </>
          )}
          {tab === 'items' && <button onClick={() => setShowAddItem(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: '#6366f1', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Add Item</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[
          { key: 'stock', label: `All Stock (${allStock.length})` },
          { key: 'low', label: `Low Stock (${lowStock.length})`, alert: lowStock.length > 0 },
          { key: 'receipts', label: `Receipts (${receipts.length})` },
          { key: 'lots', label: `Lots (${lots.length})` },
          { key: 'adjustments', label: `Adjustments (${adjustments.length})` },
          { key: 'wastage', label: `Wastage (${wastageLog.length})` },
          { key: 'items', label: `Item Catalogue (${items.length})` },
        ].map((entry: any) => (
          <button key={entry.key} onClick={() => setTab(entry.key as Tab)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === entry.key ? '#6366f1' : 'transparent', color: tab === entry.key ? '#fff' : entry.alert ? '#eab308' : 'var(--muted)' }}>{entry.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'items' ? 'Search items...' : tab === 'receipts' ? 'Search receipts...' : tab === 'lots' ? 'Search lots...' : tab === 'adjustments' ? 'Search adjustments...' : tab === 'wastage' ? 'Search wastage log...' : 'Search stock...'} style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {tab === 'items' && <select value={catFilter || ''} onChange={(e) => setCatFilter(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }}><option value="">All Categories</option>{(categories as CategoryOption[]).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
      </div>

      {importResult && (tab === 'stock' || tab === 'low') && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 800, color: 'var(--text)' }}>Latest Stock Import</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Processed {importResult.processedRows} row(s), updated {importResult.updatedRows}, skipped {importResult.skippedRows}.</div>
          {(importResult.errors || []).length > 0 && <div style={{ fontSize: 12, color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{(importResult.errors || []).slice(0, 8).join('\n')}</div>}
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{tab === 'items' ? 'Item Catalogue' : tab === 'receipts' ? 'Recent Receipts' : tab === 'lots' ? 'Batch / Expiry Lots' : tab === 'adjustments' ? 'Adjustment History' : tab === 'wastage' ? 'Wastage / Dead Stock Log' : tab === 'low' ? 'Low Stock Items' : 'Stock Overview'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{activeCount} records</div>
        </div>
        {(stockLoading || lowLoading || receiptsLoading || lotsLoading || adjustmentsLoading || wastageLoading || itemsLoading) && <div style={{ padding: 24, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={16} className="spin" /> Loading...</div>}

        {!stockLoading && tab !== 'items' && tab !== 'receipts' && tab !== 'adjustments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Category</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Quantity</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Min Level</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Status</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Updated</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(displayStock as StockRow[]).map((row) => (
                  <tr key={row.itemId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{row.itemName}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{row.itemCode}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{row.categoryName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatQty(row.quantity)} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{row.unit}</span></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)' }}>{formatQty(row.minLevel)}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: row.lowStock ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.15)', color: row.lowStock ? '#fca5a5' : '#86efac' }}>{row.lowStock ? 'Low Stock' : 'Healthy'}</span></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{formatDate(row.updatedAt)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => { setReceiveFor(row); setReceiveForm({ quantityReceived: '', receivedUom: '', unitsPerPack: '1', batchNumber: '', expiryDate: '', supplierName: '', referenceNumber: '', unitCost: '', notes: '' }) }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>Receive</button>
                        <button onClick={() => { setAdjustFor(row); setAdjustForm({ adjustmentType: 'DECREASE', reasonType: 'GENERAL', lotId: '', quantityValue: '', reason: '', notes: '' }) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}><Scale size={12} /> Adjust</button>
                        <button onClick={() => { setEditStock(row); setStockForm({ quantity: String(row.quantity ?? ''), minLevel: String(row.minLevel ?? ''), notes: '' }) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}><Edit3 size={12} /> Update</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(displayStock as StockRow[]).length === 0 && <tr><td colSpan={7} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No stock records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!itemsLoading && tab === 'items' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Category</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Unit</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Reorder</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Status</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(items as ItemRow[]).map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{item.name}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{item.code}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{item.categoryName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)' }}>{item.unit}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatQty(item.reorderLevel)}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: item.active ? 'rgba(34,197,94,.15)' : 'rgba(148,163,184,.15)', color: item.active ? '#86efac' : '#cbd5e1' }}>{item.active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ padding: '11px 14px' }}><button onClick={() => setEditItem({ ...item, reorderLevel: String(item.reorderLevel) } as any)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}><Edit3 size={12} /> Edit</button></td>
                  </tr>
                ))}
                {(items as ItemRow[]).length === 0 && <tr><td colSpan={6} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No items found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!receiptsLoading && tab === 'receipts' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Received</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Batch / Expiry</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Supplier</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Reference</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>By</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>At</th>
                </tr>
              </thead>
              <tbody>
                {(receipts as ReceiptRow[]).map((receipt) => (
                  <tr key={receipt.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{receipt.itemName}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{receipt.itemCode}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatQty(receipt.quantityReceived)} <span style={{ color: 'var(--muted)', fontSize: 11 }}>{receipt.receivedUom || ''}</span>{receipt.baseQuantityReceived ? <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatQty(receipt.baseQuantityReceived)} base</div> : null}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{receipt.batchNumber || '-'}<div style={{ fontSize: 10 }}>{receipt.expiryDate ? `Exp ${formatDate(receipt.expiryDate)}` : 'No expiry'}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{receipt.supplierName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{receipt.referenceNumber || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{receipt.receivedByName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{formatDate(receipt.receivedAt)}</td>
                  </tr>
                ))}
                {(receipts as ReceiptRow[]).length === 0 && <tr><td colSpan={7} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No receipt history found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!lotsLoading && tab === 'lots' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Batch</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Received / Remaining</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Expiry</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Supplier</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(lots as LotRow[]).map((lot) => (
                  <tr key={lot.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{lot.itemName}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{lot.itemCode}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{lot.batchNumber || 'No batch'}<div style={{ fontSize: 10 }}>{lot.receivedUom || lot.stockUnit} × {formatQty(lot.unitsPerPack)}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatQty(lot.quantityReceived)} {lot.receivedUom || lot.stockUnit}<div style={{ fontSize: 10, color: 'var(--muted)' }}>Remaining {formatQty(lot.remainingQuantity)} {lot.stockUnit}</div></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{lot.expiryDate ? formatDate(lot.expiryDate) : 'No expiry'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{lot.supplierName || '-'}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: lot.lotStatus === 'EXPIRED' ? 'rgba(239,68,68,.15)' : lot.lotStatus === 'EXPIRING_SOON' ? 'rgba(234,179,8,.15)' : 'rgba(34,197,94,.15)', color: lot.lotStatus === 'EXPIRED' ? '#fca5a5' : lot.lotStatus === 'EXPIRING_SOON' ? '#fde68a' : '#86efac' }}>{lot.lotStatus}</span></td>
                  </tr>
                ))}
                {(lots as LotRow[]).length === 0 && <tr><td colSpan={6} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No stock lots found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!adjustmentsLoading && tab === 'adjustments' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Type</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Value</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Before / After</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Reason</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>By</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>At</th>
                </tr>
              </thead>
              <tbody>
                {(adjustments as AdjustmentRow[]).map((adjustment) => (
                  <tr key={adjustment.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{adjustment.itemName}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{adjustment.itemCode}</div></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: adjustment.adjustmentType === 'DECREASE' ? 'rgba(239,68,68,.15)' : adjustment.adjustmentType === 'INCREASE' ? 'rgba(34,197,94,.15)' : 'rgba(99,102,241,.15)', color: adjustment.adjustmentType === 'DECREASE' ? '#fca5a5' : adjustment.adjustmentType === 'INCREASE' ? '#86efac' : '#c7d2fe' }}>{adjustment.adjustmentType}</span></td>
                    <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{formatQty(adjustment.quantityValue)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{formatQty(adjustment.quantityBefore)} {'->'} {formatQty(adjustment.quantityAfter)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{adjustment.reason}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{adjustment.adjustedByName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{formatDate(adjustment.adjustedAt)}</td>
                  </tr>
                ))}
                {(adjustments as AdjustmentRow[]).length === 0 && <tr><td colSpan={7} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No stock adjustments found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {!wastageLoading && tab === 'wastage' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.02)' }}>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Item</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Reason Type</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Batch</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Quantity</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>Reason</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>By</th>
                  <th style={{ padding: '11px 14px', fontSize: 11, color: 'var(--muted)' }}>At</th>
                </tr>
              </thead>
              <tbody>
                {(wastageLog as AdjustmentRow[]).map((entry) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{entry.itemName}</div><div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{entry.itemCode}</div></td>
                    <td style={{ padding: '11px 14px' }}><span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: entry.impactType === 'DEAD_STOCK' ? 'rgba(148,163,184,.16)' : 'rgba(239,68,68,.15)', color: entry.impactType === 'DEAD_STOCK' ? '#cbd5e1' : '#fca5a5' }}>{entry.reasonType || entry.impactType || 'GENERAL'}</span></td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{entry.batchNumber || 'Manual / whole stock'}</td>
                    <td style={{ padding: '11px 14px', color: '#ef4444', fontWeight: 800 }}>{formatQty(Math.abs(Number(entry.quantityDelta || 0)))}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{entry.reason}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{entry.adjustedByName || '-'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--muted)', fontSize: 12 }}>{formatDate(entry.adjustedAt)}</td>
                  </tr>
                ))}
                {(wastageLog as AdjustmentRow[]).length === 0 && <tr><td colSpan={7} style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>No wastage or dead-stock events found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editStock && <Modal><div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><div><div style={{ fontWeight: 800, color: 'var(--text)' }}>Update Stock</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{editStock.itemName}</div></div><button onClick={() => setEditStock(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button></div><div style={{ padding: 16, display: 'grid', gap: 12 }}><Field label="Quantity"><input value={stockForm.quantity} onChange={(e) => setStockForm((s) => ({ ...s, quantity: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><Field label="Min Level"><input value={stockForm.minLevel} onChange={(e) => setStockForm((s) => ({ ...s, minLevel: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><Field label="Notes"><textarea value={stockForm.notes} onChange={(e) => setStockForm((s) => ({ ...s, notes: e.target.value }))} rows={3} style={textareaStyle} /></Field></div><ModalActions onClose={() => setEditStock(null)} onSubmit={() => doUpdateStock.mutate()} loading={doUpdateStock.isPending} submitText="Save Stock" /></Modal>}

      {receiveFor && <Modal><div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><div><div style={{ fontWeight: 800, color: 'var(--text)' }}>Receive Stock</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{receiveFor.itemName}</div></div><button onClick={() => setReceiveFor(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button></div><div style={{ padding: 16, display: 'grid', gap: 12 }}><Field label="Quantity Received"><input value={receiveForm.quantityReceived} onChange={(e) => setReceiveForm((s) => ({ ...s, quantityReceived: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><Field label="Received UOM"><input value={receiveForm.receivedUom} onChange={(e) => setReceiveForm((s) => ({ ...s, receivedUom: e.target.value }))} placeholder="Bag / Box / Carton" style={inputStyle} /></Field><Field label="Units Per Pack"><input value={receiveForm.unitsPerPack} onChange={(e) => setReceiveForm((s) => ({ ...s, unitsPerPack: e.target.value }))} type="number" step="0.001" style={inputStyle} /></Field><Field label="Batch Number"><input value={receiveForm.batchNumber} onChange={(e) => setReceiveForm((s) => ({ ...s, batchNumber: e.target.value }))} style={inputStyle} /></Field><Field label="Expiry Date"><input value={receiveForm.expiryDate} onChange={(e) => setReceiveForm((s) => ({ ...s, expiryDate: e.target.value }))} type="date" style={inputStyle} /></Field><Field label="Supplier Name"><input value={receiveForm.supplierName} onChange={(e) => setReceiveForm((s) => ({ ...s, supplierName: e.target.value }))} style={inputStyle} /></Field><Field label="Reference Number"><input value={receiveForm.referenceNumber} onChange={(e) => setReceiveForm((s) => ({ ...s, referenceNumber: e.target.value }))} style={inputStyle} /></Field><Field label="Unit Cost"><input value={receiveForm.unitCost} onChange={(e) => setReceiveForm((s) => ({ ...s, unitCost: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><Field label="Notes"><textarea value={receiveForm.notes} onChange={(e) => setReceiveForm((s) => ({ ...s, notes: e.target.value }))} rows={3} style={textareaStyle} /></Field></div><ModalActions onClose={() => setReceiveFor(null)} onSubmit={() => doReceiveStock.mutate()} loading={doReceiveStock.isPending} submitText="Record Receipt" disabled={!receiveForm.quantityReceived} /></Modal>}

      {adjustFor && <Modal><div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><div><div style={{ fontWeight: 800, color: 'var(--text)' }}>Adjust Stock</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{adjustFor.itemName} • Current {formatQty(adjustFor.quantity)} {adjustFor.unit}</div></div><button onClick={() => setAdjustFor(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button></div><div style={{ padding: 16, display: 'grid', gap: 12 }}><Field label="Adjustment Type"><select value={adjustForm.adjustmentType} onChange={(e) => setAdjustForm((s) => ({ ...s, adjustmentType: e.target.value }))} style={inputStyle}><option value="DECREASE">Decrease</option><option value="INCREASE">Increase</option><option value="SET_COUNT">Set Count</option></select></Field><Field label="Reason Type"><select value={adjustForm.reasonType} onChange={(e) => setAdjustForm((s) => ({ ...s, reasonType: e.target.value }))} style={inputStyle}><option value="GENERAL">General</option><option value="WASTAGE">Wastage</option><option value="SPOILAGE">Spoilage</option><option value="EXPIRED">Expired</option><option value="DAMAGE">Damage</option><option value="DEAD_STOCK">Dead Stock</option><option value="STOCK_AUDIT">Stock Audit</option></select></Field><Field label="Linked Lot (Optional)"><select value={adjustForm.lotId} onChange={(e) => setAdjustForm((s) => ({ ...s, lotId: e.target.value }))} style={inputStyle}><option value="">Whole stock / no lot link</option>{(lots as LotRow[]).filter(lot => lot.itemCode === adjustFor.itemCode).map((lot) => <option key={lot.id} value={lot.id}>{lot.batchNumber || 'No batch'} • Remaining {formatQty(lot.remainingQuantity)} {lot.stockUnit}</option>)}</select></Field><Field label={adjustForm.adjustmentType === 'SET_COUNT' ? 'New Count' : 'Quantity'}><input value={adjustForm.quantityValue} onChange={(e) => setAdjustForm((s) => ({ ...s, quantityValue: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><Field label="Reason"><input value={adjustForm.reason} onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))} placeholder="Example: expired tomato puree write-off" style={inputStyle} /></Field><Field label="Notes"><textarea value={adjustForm.notes} onChange={(e) => setAdjustForm((s) => ({ ...s, notes: e.target.value }))} rows={3} style={textareaStyle} /></Field></div><ModalActions onClose={() => setAdjustFor(null)} onSubmit={() => doAdjustStock.mutate()} loading={doAdjustStock.isPending} submitText="Save Adjustment" disabled={!adjustForm.quantityValue || !adjustForm.reason.trim()} /></Modal>}

      {showAddItem && <Modal><div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><div style={{ fontWeight: 800, color: 'var(--text)' }}>Add Item</div><button onClick={() => setShowAddItem(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button></div><div style={{ padding: 16, display: 'grid', gap: 12 }}><Field label="Code"><input value={itemForm.code} onChange={(e) => setItemForm((s) => ({ ...s, code: e.target.value }))} style={inputStyle} /></Field><Field label="Name"><input value={itemForm.name} onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))} style={inputStyle} /></Field><Field label="Unit"><input value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} style={inputStyle} /></Field><Field label="Category"><select value={itemForm.categoryId} onChange={(e) => setItemForm((s) => ({ ...s, categoryId: e.target.value }))} style={inputStyle}><option value="">No Category</option>{(categories as CategoryOption[]).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Reorder Level"><input value={itemForm.reorderLevel} onChange={(e) => setItemForm((s) => ({ ...s, reorderLevel: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field></div><ModalActions onClose={() => setShowAddItem(false)} onSubmit={() => doCreateItem.mutate()} loading={doCreateItem.isPending} submitText="Create Item" disabled={!itemForm.code.trim() || !itemForm.name.trim()} /></Modal>}

      {editItem && <Modal><div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}><div><div style={{ fontWeight: 800, color: 'var(--text)' }}>Edit Item</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{editItem.code}</div></div><button onClick={() => setEditItem(null)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button></div><div style={{ padding: 16, display: 'grid', gap: 12 }}><Field label="Name"><input value={editItem.name} onChange={(e) => setEditItem((s: any) => ({ ...s, name: e.target.value }))} style={inputStyle} /></Field><Field label="Unit"><input value={editItem.unit} onChange={(e) => setEditItem((s: any) => ({ ...s, unit: e.target.value }))} style={inputStyle} /></Field><Field label="Reorder Level"><input value={String(editItem.reorderLevel)} onChange={(e) => setEditItem((s: any) => ({ ...s, reorderLevel: e.target.value }))} type="number" step="0.01" style={inputStyle} /></Field><label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={editItem.active} onChange={(e) => setEditItem((s: any) => ({ ...s, active: e.target.checked }))} />Active Item</label></div><ModalActions onClose={() => setEditItem(null)} onSubmit={() => doUpdateItem.mutate()} loading={doUpdateItem.isPending} submitText="Save Item" disabled={!editItem.name.trim()} /></Modal>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
}




