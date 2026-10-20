import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import {
  MAX_IMAGE_BYTES,
  createProduct,
  fetchAdminProducts,
  setProductActive,
  updateStock,
  type AdminProduct,
} from "../lib/adminProducts";
import { useAuthStore } from "../store/authStore";
import { useProductStore } from "../store/productStore";
import type { ProductCategory } from "../types";
import { formatPrice } from "../utils/formatPrice";

const SHOE_SIZES = ["39", "40", "41", "42", "43", "44"];
const CLOTHING_SIZES = ["S", "M", "L", "XL"];
const CATEGORIES: ProductCategory[] = ["Sneakers", "Tops", "Bottoms"];
const COLOR_PRESETS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#ffffff" },
  { name: "Grey", hex: "#8a8f98" },
  { name: "Navy", hex: "#1f2a44" },
  { name: "Red", hex: "#c0392b" },
  { name: "Green", hex: "#2f6b4f" },
  { name: "Beige", hex: "#d8c3a5" },
  { name: "Brown", hex: "#6b4a2f" },
];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
const smallButton =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold text-ink hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted";
const fileClass =
  "block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-semibold file:text-accent-ink";

let idCounter = 0;
const newId = () => `row-${(idCounter += 1)}`;

export function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) return <p className="px-4 py-20 text-center text-sm text-muted">Loading…</p>;
  if (!user) return <Navigate replace to="/login?redirect=/admin" />;
  if (role !== "admin") {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">No access</h1>
        <p className="mt-3 text-sm text-muted">This page is only for shop admins.</p>
      </section>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setProducts(await fetchAdminProducts());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refresh both this list and the public storefront.
  async function handleChanged() {
    await reload();
    await useProductStore.getState().load(true);
  }

  return (
    <div className="mx-auto max-w-content px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <h1 className="text-4xl font-extrabold tracking-tightest text-ink">Admin</h1>
      <p className="mt-2 text-sm text-muted">Post products, set stock, and hide items from the shop.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <NewProductForm onCreated={handleChanged} />

        <section aria-labelledby="catalog-heading">
          <h2 className="text-xl font-bold tracking-tight text-ink" id="catalog-heading">Your products</h2>
          {isLoading && <p className="mt-4 text-sm text-muted">Loading products…</p>}
          {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
          {!isLoading && !error && products.length === 0 && (
            <p className="mt-4 text-sm text-muted">Nothing posted yet. Add your first product with the form.</p>
          )}
          <ul className="mt-4 space-y-4">
            {products.map((product) => (
              <AdminProductRow key={product.id} onChanged={handleChanged} product={product} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

interface SizeRow {
  id: string;
  size: string;
}

interface ColorRow {
  id: string;
  name: string;
  hex: string;
  file: File | null;
}

const stockKey = (colorId: string | null, sizeId: string) => `${colorId ?? "none"}|${sizeId}`;

function NewProductForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Sneakers");
  const [price, setPrice] = useState("");
  const [badge, setBadge] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [stock, setStock] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return setPreview(null);
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const usePreset = (list: string[]) => setSizes(list.map((size) => ({ id: newId(), size })));
  const updateSize = (id: string, size: string) =>
    setSizes((current) => current.map((row) => (row.id === id ? { ...row, size } : row)));
  const updateColor = (id: string, patch: Partial<ColorRow>) =>
    setColors((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const addColor = (preset?: { name: string; hex: string }) =>
    setColors((current) => {
      if (preset && current.some((row) => row.name.toLowerCase() === preset.name.toLowerCase())) return current;
      return [...current, { id: newId(), name: preset?.name ?? "", hex: preset?.hex ?? "#111111", file: null }];
    });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const priceEtb = Number(price);
    if (name.trim().length < 2) return setError("Enter the product name.");
    if (!Number.isInteger(priceEtb) || priceEtb <= 0) return setError("Enter the price in whole birr, like 2500.");
    if (!image) return setError("Choose the main product photo.");

    for (const file of [image, ...colors.map((color) => color.file)]) {
      if (!file) continue;
      if (!IMAGE_TYPES.includes(file.type)) return setError("Use JPG, PNG or WebP photos.");
      if (file.size > MAX_IMAGE_BYTES) return setError("Each photo must be under 20 MB.");
    }

    const colorNames = colors.map((color) => color.name.trim().toLowerCase());
    if (colorNames.some((colorName) => colorName === "") || new Set(colorNames).size !== colorNames.length) {
      return setError("Every color needs its own name.");
    }
    if (colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color.hex))) return setError("Pick a valid swatch color.");

    const sizeNames = sizes.map((row) => row.size.trim().toLowerCase());
    if (sizes.length === 0) return setError("Add at least one size.");
    if (sizeNames.some((sizeName) => sizeName === "") || new Set(sizeNames).size !== sizeNames.length) {
      return setError("Every size needs a name, and sizes cannot repeat.");
    }

    const variants = [];
    for (const [colorIndex, color] of (colors.length > 0 ? colors : [null]).entries()) {
      for (const row of sizes) {
        const raw = (stock[stockKey(color?.id ?? null, row.id)] ?? "").trim();
        const value = raw === "" ? 0 : Number(raw);
        if (!Number.isInteger(value) || value < 0) return setError("Stock must be a whole number, 0 or more.");
        variants.push({ colorIndex: color ? colorIndex : null, size: row.size.trim(), stock: value });
      }
    }

    setBusy(true);
    try {
      await createProduct({
        name,
        category,
        priceEtb,
        badge,
        imageAlt,
        image,
        colors: colors.map((color) => ({ name: color.name, hex: color.hex, image: color.file })),
        variants,
      });
      setSuccess(`"${name.trim()}" is now in the shop.`);
      setName(""); setPrice(""); setBadge(""); setImageAlt(""); setImage(null);
      setColors([]); setSizes([]); setStock({});
      await onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not post the product.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="h-fit space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold tracking-tight text-ink">Post a product</h2>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="p-name">Name</label>
        <input className={inputClass} id="p-name" onChange={(event) => setName(event.target.value)} placeholder="Street high-top" type="text" value={name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="p-category">Category</label>
          <select className={inputClass} id="p-category" onChange={(event) => setCategory(event.target.value as ProductCategory)} value={category}>
            {CATEGORIES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="p-price">Price (ETB)</label>
          <input className={inputClass} id="p-price" inputMode="numeric" onChange={(event) => setPrice(event.target.value)} placeholder="2500" type="text" value={price} />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="p-badge">Badge <span className="font-normal text-muted">(optional)</span></label>
        <input className={inputClass} id="p-badge" onChange={(event) => setBadge(event.target.value)} placeholder="Just in" type="text" value={badge} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="p-image">Main photo</label>
        <input accept="image/jpeg,image/png,image/webp" className={fileClass} id="p-image" onChange={(event) => setImage(event.target.files?.[0] ?? null)} type="file" />
        <p className="mt-2 text-xs text-muted">Photos are resized and compressed automatically. The whole photo is shown in the shop.</p>
        {preview && <img alt="Preview of the chosen product" className="mt-3 aspect-[4/4.5] w-40 rounded-xl bg-canvas object-contain" src={preview} />}
        <input aria-label="Photo description" className={`${inputClass} mt-3`} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the photo (for screen readers)" type="text" value={imageAlt} />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Colors <span className="font-normal text-muted">(optional)</span></legend>
        <p className="mb-3 text-xs text-muted">Skip this if the product comes in one color. Each color can have its own photo, shown when a customer picks it.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button className={`${smallButton} gap-2`} key={preset.name} onClick={() => addColor(preset)} type="button">
              <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ backgroundColor: preset.hex }} />
              {preset.name}
            </button>
          ))}
          <button className={`${smallButton} gap-1`} onClick={() => addColor()} type="button"><Plus aria-hidden="true" size={14} /> Other color</button>
        </div>
        <ul className="space-y-3">
          {colors.map((color) => (
            <li className="rounded-xl border border-border bg-canvas p-3" key={color.id}>
              <div className="flex items-center gap-2">
                <input aria-label={`Swatch color for ${color.name || "new color"}`} className="size-10 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0.5" onChange={(event) => updateColor(color.id, { hex: event.target.value })} type="color" value={color.hex} />
                <input aria-label="Color name" className={inputClass} onChange={(event) => updateColor(color.id, { name: event.target.value })} placeholder="Color name" type="text" value={color.name} />
                <button aria-label={`Remove ${color.name || "color"}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setColors(colors.filter((row) => row.id !== color.id))} type="button">
                  <X aria-hidden="true" size={16} />
                </button>
              </div>
              <label className="mt-3 block text-xs font-semibold text-muted">
                Photo of this color (optional)
                <input accept="image/jpeg,image/png,image/webp" className={`${fileClass} mt-1`} onChange={(event) => updateColor(color.id, { file: event.target.files?.[0] ?? null })} type="file" />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Sizes</legend>
        <div className="mb-3 flex flex-wrap gap-2">
          <button className={smallButton} onClick={() => usePreset(SHOE_SIZES)} type="button">Shoe sizes 39–44</button>
          <button className={smallButton} onClick={() => usePreset(CLOTHING_SIZES)} type="button">S – XL</button>
          <button className={smallButton} onClick={() => usePreset(["One size"])} type="button">One size</button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {sizes.map((row, index) => (
            <li className="flex items-center gap-1" key={row.id}>
              <input aria-label={`Size ${index + 1}`} className="min-h-10 w-24 rounded-full border border-border bg-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onChange={(event) => updateSize(row.id, event.target.value)} type="text" value={row.size} />
              <button aria-label={`Remove size ${row.size || index + 1}`} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setSizes(sizes.filter((item) => item.id !== row.id))} type="button">
                <X aria-hidden="true" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button className={`${smallButton} mt-3 gap-1`} onClick={() => setSizes([...sizes, { id: newId(), size: "" }])} type="button">
          <Plus aria-hidden="true" size={14} /> Add size
        </button>
      </fieldset>

      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Stock {colors.length > 0 ? "for each color and size" : "for each size"}</legend>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2 pr-3 font-semibold text-muted">{colors.length > 0 ? "Color" : ""}</th>
                  {sizes.map((row) => <th className="px-1 py-2 text-center font-semibold text-muted" key={row.id}>{row.size || "?"}</th>)}
                </tr>
              </thead>
              <tbody>
                {(colors.length > 0 ? colors : [null]).map((color) => (
                  <tr key={color?.id ?? "none"}>
                    <th className="whitespace-nowrap py-1 pr-3 font-semibold text-ink" scope="row">
                      {color ? (
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
                          {color.name || "Unnamed"}
                        </span>
                      ) : "Units in stock"}
                    </th>
                    {sizes.map((row) => (
                      <td className="px-1 py-1" key={row.id}>
                        <input
                          aria-label={`Stock, ${color ? `${color.name || "color"}, ` : ""}size ${row.size || "?"}`}
                          className="min-h-10 w-16 rounded-full border border-border bg-surface px-2 text-center text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                          inputMode="numeric"
                          onChange={(event) => setStock({ ...stock, [stockKey(color?.id ?? null, row.id)]: event.target.value })}
                          placeholder="0"
                          type="text"
                          value={stock[stockKey(color?.id ?? null, row.id)] ?? ""}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {success && <p className="text-sm text-ink" role="status">{success}</p>}

      <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted" disabled={busy} type="submit">
        {busy ? "Posting…" : "Post product"}
      </button>
    </form>
  );
}

function AdminProductRow({ product, onChanged }: { product: AdminProduct; onChanged: () => Promise<void> }) {
  const [stocks, setStocks] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((variant) => [variant.id, String(variant.stock)])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // One group per color, or a single group when the product has no colors.
  const groups =
    product.colors.length > 0
      ? product.colors.map((color) => ({
          key: color.id,
          color,
          variants: product.variants.filter((variant) => variant.colorId === color.id),
        }))
      : [{ key: "none", color: null, variants: product.variants.filter((variant) => variant.colorId === null) }];

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await onChanged();
      setMessage(done);
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function saveStock() {
    const changes = product.variants.filter((variant) => stocks[variant.id] !== String(variant.stock));
    if (changes.some((variant) => !/^\d+$/.test(stocks[variant.id]))) return setMessage("Stock must be a whole number, 0 or more.");
    if (changes.length === 0) return setMessage("No changes to save.");
    void run(async () => {
      await Promise.all(changes.map((variant) => updateStock(variant.id, Number(stocks[variant.id]))));
    }, "Stock saved.");
  }

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-4">
        <img alt="" className="size-20 shrink-0 rounded-xl bg-canvas object-contain" height="160" loading="lazy" src={product.imageUrl} width="160" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{product.name}</p>
          <p className="mt-1 text-xs text-muted">{product.category} · {formatPrice(product.priceEtb)} · {product.active ? "Visible in shop" : "Hidden"}</p>
          <button className={`${smallButton} mt-3`} disabled={busy} onClick={() => void run(() => setProductActive(product.id, !product.active), product.active ? "Hidden from the shop." : "Visible in the shop.")} type="button">
            {product.active ? "Hide from shop" : "Show in shop"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.key}>
            {group.color && (
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
                <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ backgroundColor: group.color.hex }} />
                {group.color.name}
              </p>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
              {group.variants.map((variant) => (
                <label className="text-xs font-semibold text-muted" key={variant.id}>
                  {variant.size}
                  <input aria-label={`Stock, ${group.color ? `${group.color.name}, ` : ""}size ${variant.size}`} className="mt-1 min-h-10 w-full rounded-full border border-border bg-canvas px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" inputMode="numeric" onChange={(event) => setStocks({ ...stocks, [variant.id]: event.target.value })} type="text" value={stocks[variant.id] ?? ""} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className={smallButton} disabled={busy} onClick={saveStock} type="button">Save stock</button>
        {message && <p className="text-xs text-muted" role="status">{message}</p>}
      </div>
    </li>
  );
}
