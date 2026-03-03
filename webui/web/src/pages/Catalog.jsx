import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Boxes, Plus, Trash2, RefreshCw, Wand2 } from 'lucide-react';
import { Button, Card, FormField, Input, Pill } from '../components/ui';
import NoticeModal from '../components/NoticeModal';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const defaultCategoryForm = { name: '', slug: '', description: '', isActive: true, sortOrder: 0 };
const defaultProductForm = {
  categoryId: '',
  name: '',
  slug: '',
  description: '',
  serviceType: 'pterodactyl',
  billingType: 'fixed',
  monthly: 0,
  quarterly: 0,
  yearly: 0,
  specsText: '{}',
  providerMappingText: '{}',
  isActive: true
};

const Catalog = () => {
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [seedingPtero, setSeedingPtero] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { notice, showNotice, closeNotice } = useModalFeedback();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/api/billing-catalog/categories', { params: { page: 1, limit: 100 } }),
        api.get('/api/billing-catalog/products', { params: { page: 1, limit: 100 } })
      ]);
      const nextCategories = catRes.data.categories || [];
      setCategories(nextCategories);
      setProducts(prodRes.data.products || []);
      setProductForm((prev) => ({
        ...prev,
        categoryId: prev.categoryId || nextCategories[0]?._id || ''
      }));
    } catch (err) {
      showNotice({ title: 'Gagal Ambil Catalog', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      await api.post('/api/billing-catalog/categories', {
        ...categoryForm,
        sortOrder: Number(categoryForm.sortOrder) || 0
      });
      setCategoryForm(defaultCategoryForm);
      setShowCreateCategory(false);
      await fetchData();
      showNotice({ title: 'Berhasil', message: 'Kategori dibuat.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Create Category Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSavingCategory(false);
    }
  };

  const parseJsonSafe = (text, label) => {
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${label} harus JSON valid`);
    }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      if (!productForm.categoryId) throw new Error('Pilih kategori dulu');
      const specs = parseJsonSafe(productForm.specsText, 'Specs');
      const providerMapping = parseJsonSafe(productForm.providerMappingText, 'Provider mapping');

      await api.post('/api/billing-catalog/products', {
        categoryId: productForm.categoryId,
        name: productForm.name,
        slug: productForm.slug,
        description: productForm.description,
        serviceType: productForm.serviceType,
        billingType: productForm.billingType,
        prices: {
          monthly: Number(productForm.monthly) || 0,
          quarterly: Number(productForm.quarterly) || 0,
          yearly: Number(productForm.yearly) || 0
        },
        specs,
        providerMapping,
        isActive: productForm.isActive
      });

      setProductForm((prev) => ({ ...defaultProductForm, categoryId: prev.categoryId || categories[0]?._id || '' }));
      setShowCreateProduct(false);
      await fetchData();
      showNotice({ title: 'Berhasil', message: 'Produk dibuat.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Create Product Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSavingProduct(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await api.delete(`/api/billing-catalog/categories/${deleteTarget._id}`);
      } else {
        await api.delete(`/api/billing-catalog/products/${deleteTarget._id}`);
      }
      await fetchData();
      showNotice({ title: 'Deleted', message: `${deleteTarget.type} berhasil dihapus.`, tone: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      showNotice({ title: 'Delete Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const seedPterodactylDefaults = async () => {
    setSeedingPtero(true);
    try {
      const { data } = await api.post('/api/billing-catalog/seed/pterodactyl-defaults');
      await fetchData();
      showNotice({ title: 'Seed Berhasil', message: data?.message || 'Default pterodactyl plans berhasil di-seed.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Seed Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSeedingPtero(false);
    }
  };

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <Boxes size={20} />
            </div>
            <div>
              <h1 className="heading-primary">Product Catalog</h1>
              <p className="heading-secondary">{categories.length} categories, {products.length} products</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateCategory(true)} type="button">
              <Plus size={14} /> Create Category
            </Button>
            <Button onClick={() => setShowCreateProduct(true)} type="button">
              <Plus size={14} /> Create Product
            </Button>
            <Button onClick={fetchData} type="button">
              <RefreshCw size={14} /> Reload
            </Button>
            <Button onClick={seedPterodactylDefaults} type="button" variant="primary" disabled={seedingPtero}>
              <Wand2 size={14} /> {seedingPtero ? 'Seeding...' : 'Seed Pterodactyl Plans'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-3">Categories</h2>
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading...</p> : (
              <div className="space-y-2">
                {categories.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">No categories yet.</p> : categories.map((cat) => (
                  <div key={cat._id} className="border border-[var(--border-color)] rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={cat.isActive ? 'success' : 'warning'}>{cat.isActive ? 'Active' : 'Inactive'}</Pill>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ ...cat, type: 'category' })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-3">Products</h2>
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading...</p> : (
              <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                {products.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">No products yet.</p> : products.map((prod) => (
                  <div key={prod._id} className="border border-[var(--border-color)] rounded-lg p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{prod.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">{prod.slug}</p>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                        <span>{prod.serviceType}</span> • <span>{prod.categoryId?.name || '-'}</span> • <span>Monthly Rp {new Intl.NumberFormat('id-ID').format(prod.prices?.monthly || 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={prod.isActive ? 'success' : 'warning'}>{prod.isActive ? 'Active' : 'Inactive'}</Pill>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget({ ...prod, type: 'product' })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type || ''}`}
        message={`Hapus ${deleteTarget?.type} "${deleteTarget?.name}"?`}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <Modal open={showCreateCategory} onClose={() => setShowCreateCategory(false)} widthClass="max-w-lg">
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">Create Category</h3>
        <form onSubmit={createCategory} className="space-y-3">
          <FormField label="Name">
            <Input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} required />
          </FormField>
          <FormField label="Slug (optional)">
            <Input value={categoryForm.slug} onChange={(e) => setCategoryForm((p) => ({ ...p, slug: e.target.value }))} placeholder="panel-pterodactyl" />
          </FormField>
          <FormField label="Description">
            <Input value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
          <FormField label="Sort Order">
            <Input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))} />
          </FormField>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Active
          </label>
          <Button type="submit" variant="primary" disabled={savingCategory} className="w-full">
            <Plus size={14} /> {savingCategory ? 'Saving...' : 'Create Category'}
          </Button>
        </form>
      </Modal>
      <Modal open={showCreateProduct} onClose={() => setShowCreateProduct(false)} widthClass="max-w-2xl">
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-4">Create Product</h3>
        <form onSubmit={createProduct} className="space-y-3">
          <FormField label="Category">
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm((p) => ({ ...p, categoryId: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              required
            >
              <option value="" disabled>Pilih category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Name">
              <Input value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
            </FormField>
            <FormField label="Slug (optional)">
              <Input value={productForm.slug} onChange={(e) => setProductForm((p) => ({ ...p, slug: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Service Type">
              <select
                value={productForm.serviceType}
                onChange={(e) => setProductForm((p) => ({ ...p, serviceType: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              >
                <option value="pterodactyl">pterodactyl</option>
                <option value="lxc">lxc</option>
                <option value="kvm">kvm</option>
              </select>
            </FormField>
            <FormField label="Billing Type">
              <select
                value={productForm.billingType}
                onChange={(e) => setProductForm((p) => ({ ...p, billingType: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm"
              >
                <option value="fixed">fixed</option>
                <option value="metered">metered</option>
              </select>
            </FormField>
          </div>
          <FormField label="Description">
            <Input value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Monthly (IDR)">
              <Input type="number" min={0} value={productForm.monthly} onChange={(e) => setProductForm((p) => ({ ...p, monthly: e.target.value }))} />
            </FormField>
            <FormField label="Quarterly (IDR)">
              <Input type="number" min={0} value={productForm.quarterly} onChange={(e) => setProductForm((p) => ({ ...p, quarterly: e.target.value }))} />
            </FormField>
            <FormField label="Yearly (IDR)">
              <Input type="number" min={0} value={productForm.yearly} onChange={(e) => setProductForm((p) => ({ ...p, yearly: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Specs JSON">
            <textarea
              rows={3}
              value={productForm.specsText}
              onChange={(e) => setProductForm((p) => ({ ...p, specsText: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm font-mono resize-y"
            />
          </FormField>
          <FormField label="Provider Mapping JSON">
            <textarea
              rows={3}
              value={productForm.providerMappingText}
              onChange={(e) => setProductForm((p) => ({ ...p, providerMappingText: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm font-mono resize-y"
            />
          </FormField>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={productForm.isActive} onChange={(e) => setProductForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Active
          </label>
          <Button type="submit" variant="primary" disabled={savingProduct} className="w-full">
            <Plus size={14} /> {savingProduct ? 'Saving...' : 'Create Product'}
          </Button>
        </form>
      </Modal>
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

export default Catalog;
