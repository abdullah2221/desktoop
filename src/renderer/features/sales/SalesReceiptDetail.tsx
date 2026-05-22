import React, { useEffect, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';

interface Props {
  invoiceNo: string;
  canReprint: boolean;
  canVoid: boolean;
  canReturn: boolean;
  onClose: () => void;
  onVoid: (invoiceNo: string) => Promise<void>;
  onOpenReturn: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const SalesReceiptDetail: React.FC<Props> = ({ invoiceNo, canReprint, canVoid, canReturn, onClose, onVoid, onOpenReturn, notify }) => {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        try {
          const payload = await window.api.sales.getReceiptDetail(invoiceNo);
          setDetail(payload);
        } catch (error: any) {
          const msg = String(error?.message || error || '');
          if (!msg.includes("No handler registered for 'sales:getReceiptDetail'")) throw error;
          const sale = await window.api.sales.getById(invoiceNo);
          const items = await window.api.sales.getItems(invoiceNo);
          if (!sale) {
            setDetail(null);
            return;
          }
          const grossSubtotal = Number((sale as any).subtotal || (sale as any).total || 0);
          const itemDiscounts = (items || []).reduce((sum: number, i: any) => sum + Number(i.discount_amount || 0), 0);
          const invoiceDiscount = Math.max(0, Number((sale as any).discount_amount ?? (sale as any).discount ?? 0) - itemDiscounts);
          const taxAmount = Number((sale as any).tax_amount || 0);
          const total = Number((sale as any).total || 0);
          const totalPaid = (sale as any).status === 'Paid' ? total : 0;
          setDetail({
            sale,
            items,
            summary: {
              gross_subtotal: grossSubtotal,
              item_discounts: itemDiscounts,
              invoice_discount: invoiceDiscount,
              tax_amount: taxAmount,
              total,
              total_paid: totalPaid,
              balance: Math.max(0, total - totalPaid)
            },
            statuses: {
              accounting_posted: false,
              stock_posted: true,
              return_status: 'UNKNOWN'
            },
            audit: []
          });
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [invoiceNo]);

  const reprint = async (duplicate = false) => {
    const payload = duplicate ? await window.api.receipts.duplicateFromSale(invoiceNo) : await window.api.receipts.fromSale(invoiceNo);
    const html = await window.api.receipts.preview(payload, duplicate);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    await window.api.receipts.print(payload, duplicate);
    notify('success', duplicate ? 'Duplicate copy printed.' : 'Receipt reprinted.');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div className="w-[560px] bg-white h-full overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Sales Receipt Detail</h3>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
        {loading && <p className="text-xs text-slate-500">Loading...</p>}
        {!loading && !detail && <p className="text-xs text-red-600">Receipt not found.</p>}
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><b>Receipt #:</b> {detail.sale.invoiceNo}</p>
              <p><b>Status:</b> <Badge variant={detail.sale.status === 'VOIDED' ? 'danger' : 'success'}>{detail.sale.status}</Badge></p>
              <p><b>Date/Time:</b> {detail.sale.sale_time ? new Date(detail.sale.sale_time).toLocaleString() : detail.sale.date}</p>
              <p><b>Customer:</b> {detail.sale.customerName || 'Walk-in Customer'}</p>
              <p><b>Cashier:</b> {detail.sale.cashier_name || '-'}</p>
              <p><b>Branch:</b> {detail.sale.branch_name || detail.sale.branch_id || '-'}</p>
              <p><b>Register:</b> {detail.sale.register_id || '-'}</p>
              <p><b>Shift:</b> {detail.sale.shift_id || '-'}</p>
              <p><b>Payment:</b> {detail.sale.payment_method || '-'}</p>
            </div>

            <table className="erp-table">
              <thead>
                <tr><th>SKU/Barcode</th><th>Product</th><th>Qty</th><th>Unit</th><th>Disc</th><th>Tax</th><th>Total</th></tr>
              </thead>
              <tbody>
                {detail.items.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.sku || item.barcode || '-'}</td>
                    <td>{item.product_name || item.product_id}</td>
                    <td>{item.quantity}</td>
                    <td>{Number(item.price || 0).toLocaleString()}</td>
                    <td>{Number(item.discount_amount || 0).toLocaleString()}</td>
                    <td>{Number(item.tax_amount || 0).toLocaleString()}</td>
                    <td>{Number(item.line_total || ((item.price || 0) * (item.quantity || 0))).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-[6px]">
              <p><b>Gross Subtotal:</b> Rs. {Number(detail.summary.gross_subtotal || 0).toLocaleString()}</p>
              <p><b>Item Discounts:</b> Rs. {Number(detail.summary.item_discounts || 0).toLocaleString()}</p>
              <p><b>Invoice Discount:</b> Rs. {Number(detail.summary.invoice_discount || 0).toLocaleString()}</p>
              <p><b>Tax:</b> Rs. {Number(detail.summary.tax_amount || 0).toLocaleString()}</p>
              <p><b>Total Paid:</b> Rs. {Number(detail.summary.total_paid || 0).toLocaleString()}</p>
              <p><b>Balance:</b> Rs. {Number(detail.summary.balance || 0).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <p><b>Accounting:</b> {detail.statuses.accounting_posted ? 'Posted' : 'Pending'}</p>
              <p><b>Stock:</b> {detail.statuses.stock_posted ? 'Posted' : 'Pending'}</p>
              <p><b>Returns:</b> {detail.statuses.return_status}</p>
            </div>

            <div>
              <p className="font-semibold text-xs mb-1">Audit Trail</p>
              <div className="max-h-28 overflow-y-auto border border-slate-200 rounded p-2 space-y-1">
                {(detail.audit || []).slice(0, 10).map((row: any) => (
                  <div key={row.id} className="text-[11px]"><b>{row.action}</b> - {row.details}</div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {canReprint && <Button size="sm" onClick={() => reprint(false)}>Reprint</Button>}
              {canReprint && <Button size="sm" variant="secondary" onClick={() => reprint(true)}>Duplicate Copy</Button>}
              {canReturn && <Button size="sm" variant="secondary" onClick={onOpenReturn}>Create Return</Button>}
              {canVoid && detail.sale.status !== 'VOIDED' && (
                <Button size="sm" variant="danger" onClick={() => onVoid(invoiceNo)}>Void Sale</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
