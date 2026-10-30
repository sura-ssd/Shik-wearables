import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RequireAdmin } from "../components/RequireAdmin";
import { MAX_IMAGE_BYTES, MAX_PHOTOS_PER_COLOR } from "../lib/adminProducts";
import { fetchProductDetail, saveProductEdits, type ProductDetail, type SavePhoto } from "../lib/editProduct";
import { compareSizes } from "../lib/products";
import { useProductStore } from "../store/productStore";
import { toast } from "../store/toastStore";
import type { ProductCategory } from "../types";

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
const newId = () => `edit-${(idCounter += 1)}`;
const stockKey = (colorKey: string | null, sizeId: string) => `${colorKey ?? "none"}|${sizeId}`;

interface PhotoForm extends SavePhoto {
  id: string;
}
interface ColorForm {
  key: string;
  id: string | null;
  name: string;
  hex: string;
  photos: PhotoForm[];
}
interface SizeForm {
  id: string;
  size: string;
  /** Sizes that are already saved keep their name, so past orders still match. */
  locked: boolean;
}

export function AdminProductEditPage() {
  return (
    <RequireAdmin redirect="/admin">
      <EditLoader />
    </RequireAdmin>
  );
}

function EditLoader() {
  const { id } = useParams();
  const [detail, setDetail] = useState<ProductDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchProductDetail(id)
      .then((result) => !cancelled && setDetail(result))
      .catch((loadError) => !cancelled && setError(loadError instanceof Error ? loadError.message : "Could not load the product."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="px-4 py-24 text-center text-sm text-danger" role="alert">{error}</p>;
  if (detail === undefined) return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Loading the product…</p>;
  if (detail === null) {
    return (
      <section className="mx-auto max-w-content px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tightest text-ink">We could not find that product</h1>
        <Link className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-4" to="/admin">Back to products</Link>
      </section>
    );
  }
  return <EditForm detail={detail} key={detail.id} />;
}

function buildInitial(detail: ProductDetail) {
  const sizes: SizeForm[] = [...new Set(detail.variants.map((variant) => variant.size))]
    .sort(compareSizes)
    .map((size) => ({ id: newId(), size, locked: true }));
  const sizeIdByName = new Map(sizes.map((row) => [row.size, row.id]));

  const colors: ColorForm[] = detail.colors.map((color) => ({
    key: color.id,
    id: color.id,
    name: color.name,
    hex: color.hex,
    photos: color.imageUrls.map((url) => ({ id: newId(), url })),
  }));

  const stock: Record<string, string> = {};
  for (const variant of detail.variants) {
    const sizeId = sizeIdByName.get(variant.size);
    if (sizeId) stock[stockKey(variant.colorId, sizeId)] = String(variant.stock);
  }
  return { sizes, colors, stock };
}

function EditForm({ detail }: { detail: ProductDetail }) {
  const navigate = useNavigate();
  const [initial] = useState(() => buildInitial(detail));
  const [name, setName] = useState(detail.name);
  const [category, setCategory] = useState<ProductCategory>(detail.category);
  const [price, setPrice] = useState(String(detail.priceEtb));
  const [badge, setBadge] = useState(detail.badge);
  const [imageAlt, setImageAlt] = useState(detail.imageAlt);
  const [active, setActive] = useState(detail.active);
  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorForm[]>(initial.colors);
  const [sizes, setSizes] = useState<SizeForm[]>(initial.sizes);
  const [stock, setStock] = useState<Record<string, string>>(initial.stock);
  const [newSize, setNewSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!newMainImage) return setMainPreview(null);
    const url = URL.createObjectURL(newMainImage);
    setMainPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newMainImage]);

  const updateColor = (key: string, patch: Partial<ColorForm>) =>
    setColors((current) => current.map((color) => (color.key === key ? { ...color, ...patch } : color)));

  function addColor(preset?: { name: string; hex: string }) {
    setColors((current) => {
      if (preset && current.some((color) => color.name.toLowerCase() === preset.name.toLowerCase())) return current;
      return [...current, { key: `new-${newId()}`, id: null, name: preset?.name ?? "", hex: preset?.hex ?? "#111111", photos: [] }];
    });
  }

  function addSize() {
    const value = newSize.trim();
    if (!value) return;
    if (sizes.some((row) => row.size.toLowerCase() === value.toLowerCase())) {
      toast.info("That size is already in the list", value);
      return;
    }
    setSizes((current) => [...current, { id: newId(), size: value, locked: false }]);
    setNewSize("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const priceEtb = Number(price);
    if (name.trim().length < 2) return setError("Enter the product name.");
    if (!Number.isInteger(priceEtb) || priceEtb <= 0) return setError("Enter the price in whole birr, like 2500.");
    if (sizes.length === 0) return setError("The product needs at least one size.");

    const photoFiles = [newMainImage, ...colors.flatMap((color) => color.photos.map((photo) => photo.file ?? null))];
    for (const file of photoFiles) {
      if (!file) continue;
      if (!IMAGE_TYPES.includes(file.type)) return setError("Use JPG, PNG or WebP photos.");
      if (file.size > MAX_IMAGE_BYTES) return setError("Each photo must be under 20 MB.");
    }

    const colorNames = colors.map((color) => color.name.trim().toLowerCase());
    if (colorNames.some((value) => value === "") || new Set(colorNames).size !== colorNames.length) {
      return setError("Every color needs its own name.");
    }
    if (colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color.hex))) return setError("Pick a valid swatch color.");
    const sizeNames = sizes.map((row) => row.size.trim().toLowerCase());
    if (sizeNames.some((value) => value === "") || new Set(sizeNames).size !== sizeNames.length) {
      return setError("Every size needs a name, and sizes cannot repeat.");
    }

    // Only stock numbers you changed are sent, so orders placed while you edit are not overwritten.
    const variants = [];
    for (const color of colors.length > 0 ? colors : [null]) {
      for (const row of sizes) {
        const key = stockKey(color?.key ?? null, row.id);
        const raw = (stock[key] ?? "").trim();
        const before = initial.stock[key];
        const unchanged = before !== undefined && raw === before.trim();
        const value = raw === "" ? 0 : Number(raw);
        if (!unchanged && (!Number.isInteger(value) || value < 0)) return setError("Stock must be a whole number, 0 or more.");
        variants.push({ colorKey: color?.key ?? null, size: row.size.trim(), stock: unchanged ? null : value });
      }
    }

    setBusy(true);
    try {
      await saveProductEdits({
        original: detail,
        name,
        category,
        priceEtb,
        badge,
        imageAlt,
        active,
        newMainImage,
        colors: colors.map((color) => ({
          key: color.key,
          id: color.id,
          name: color.name,
          hex: color.hex,
          photos: color.photos.map((photo) => ({ url: photo.url, file: photo.file })),
        })),
        variants,
      });
      toast.success("Changes saved", name.trim());
      await useProductStore.getState().load(true);
      navigate("/admin", { replace: true });
    } catch (saveError) {
      toast.error("Couldn't save the changes", saveError instanceof Error ? saveError.message : "Please try again.");
      setBusy(false);
    }
  }

  const rows = colors.length > 0 ? colors : [null];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <Link className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" to="/admin">
        <ArrowLeft aria-hidden="true" size={16} />
        All products
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tightest text-ink">Edit product</h1>
      <p className="mt-2 text-sm text-muted">Change anything, then press Save. Nothing changes in the shop until you save.</p>

      <form className="mt-8 space-y-8" noValidate onSubmit={handleSubmit}>
        <section className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-ink">Details</h2>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="e-name">Name</label>
            <input className={inputClass} id="e-name" onChange={(event) => setName(event.target.value)} type="text" value={name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="e-category">Category</label>
              <select className={inputClass} id="e-category" onChange={(event) => setCategory(event.target.value as ProductCategory)} value={category}>
                {CATEGORIES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="e-price">Price (ETB)</label>
              <input className={inputClass} id="e-price" inputMode="numeric" onChange={(event) => setPrice(event.target.value)} type="text" value={price} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="e-badge">Badge <span className="font-normal text-muted">(optional)</span></label>
            <input className={inputClass} id="e-badge" onChange={(event) => setBadge(event.target.value)} placeholder="Just in" type="text" value={badge} />
          </div>
          <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
            <input checked={active} className="size-5 accent-accent" onChange={(event) => setActive(event.target.checked)} type="checkbox" />
            Visible in the shop
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-ink">Main photo</h2>
          <img alt={mainPreview ? "The new main photo" : "The current main photo"} className="aspect-[4/4.5] w-40 rounded-xl bg-canvas object-contain" src={mainPreview ?? detail.imageUrl} />
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted" htmlFor="e-main">Replace the photo (optional)</label>
            <input accept="image/jpeg,image/png,image/webp" className={fileClass} id="e-main" onChange={(event) => setNewMainImage(event.target.files?.[0] ?? null)} type="file" />
          </div>
          <input aria-label="Photo description" className={inputClass} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe the photo (for screen readers)" type="text" value={imageAlt} />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-ink">Colors <span className="text-sm font-normal text-muted">(optional)</span></h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-muted">Each color can have up to {MAX_PHOTOS_PER_COLOR} photos. A color that customers have already ordered cannot be removed. Set its stock to 0 instead.</p>
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
              <li className="rounded-xl border border-border bg-canvas p-3" key={color.key}>
                <div className="flex items-center gap-2">
                  <input aria-label={`Swatch color for ${color.name || "new color"}`} className="size-10 shrink-0 cursor-pointer rounded-full border border-border bg-transparent p-0.5" onChange={(event) => updateColor(color.key, { hex: event.target.value })} type="color" value={color.hex} />
                  <input aria-label="Color name" className={inputClass} onChange={(event) => updateColor(color.key, { name: event.target.value })} placeholder="Color name" type="text" value={color.name} />
                  <button aria-label={`Remove ${color.name || "color"}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setColors(colors.filter((item) => item.key !== color.key))} type="button">
                    <X aria-hidden="true" size={16} />
                  </button>
                </div>
                <PhotoManager max={MAX_PHOTOS_PER_COLOR} onChange={(photos) => updateColor(color.key, { photos })} photos={color.photos} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold tracking-tight text-ink">Sizes and stock</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-muted">Changing a stock number replaces the units available now. Sizes that customers have already ordered cannot be removed. Set their stock to 0 instead.</p>

          <ul className="flex flex-wrap gap-2">
            {sizes.map((row) => (
              <li className="flex items-center gap-1" key={row.id}>
                {row.locked ? (
                  <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-canvas px-4 text-sm font-semibold text-ink">{row.size}</span>
                ) : (
                  <input aria-label="Size name" className="min-h-10 w-24 rounded-full border border-border bg-canvas px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onChange={(event) => setSizes(sizes.map((item) => (item.id === row.id ? { ...item, size: event.target.value } : item)))} type="text" value={row.size} />
                )}
                <button aria-label={`Remove size ${row.size || ""}`} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => setSizes(sizes.filter((item) => item.id !== row.id))} type="button">
                  <X aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input aria-label="New size" className="min-h-10 w-28 rounded-full border border-border bg-canvas px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onChange={(event) => setNewSize(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSize(); } }} placeholder="New size" type="text" value={newSize} />
            <button className={`${smallButton} gap-1`} onClick={addSize} type="button"><Plus aria-hidden="true" size={14} /> Add size</button>
          </div>

          <div className="mt-6 space-y-4">
            {rows.map((color) => (
              <div key={color?.key ?? "none"}>
                {color && (
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
                    <span aria-hidden="true" className="size-3 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
                    {color.name || "Unnamed"}
                  </p>
                )}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                  {sizes.map((row) => {
                    const key = stockKey(color?.key ?? null, row.id);
                    return (
                      <label className="text-xs font-semibold text-muted" key={row.id}>
                        {row.size || "?"}
                        <input
                          aria-label={`Stock, ${color ? `${color.name || "color"}, ` : ""}size ${row.size || "?"}`}
                          className="mt-1 min-h-10 w-full rounded-full border border-border bg-canvas px-2 text-center text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                          inputMode="numeric"
                          onChange={(event) => setStock({ ...stock, [key]: event.target.value })}
                          placeholder="0"
                          type="text"
                          value={stock[key] ?? ""}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-8 text-sm font-semibold text-ink hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" to="/admin">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

/** The photos of one color: remove, choose the cover, and add more. */
function PhotoManager({ photos, max, onChange }: { photos: PhotoForm[]; max: number; onChange: (photos: PhotoForm[]) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const created: string[] = [];
    const next: Record<string, string> = {};
    for (const photo of photos) {
      if (photo.file) {
        const url = URL.createObjectURL(photo.file);
        created.push(url);
        next[photo.id] = url;
      }
    }
    setUrls(next);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function handleChoose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (chosen.length > 0) onChange([...photos, ...chosen.map((file) => ({ id: newId(), file }))].slice(0, max));
  }

  return (
    <div className="mt-3">
      <label className="block text-xs font-semibold text-muted">
        Photos of this color (up to {max})
        <input accept="image/jpeg,image/png,image/webp" className={`${fileClass} mt-1 disabled:opacity-50`} disabled={photos.length >= max} multiple onChange={handleChoose} type="file" />
      </label>
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
          {photos.map((photo, index) => (
            <li className="min-w-0" key={photo.id}>
              <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
                <img alt={`Photo ${index + 1}`} className="size-full object-contain" src={photo.url ?? urls[photo.id]} />
                <button aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-canvas/95 text-ink hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => onChange(photos.filter((item) => item.id !== photo.id))} type="button">
                  <X aria-hidden="true" size={12} />
                </button>
              </div>
              {index === 0 ? (
                <p className="mt-1 text-center text-[11px] font-semibold text-ink">Cover</p>
              ) : (
                <button className="mt-1 w-full text-center text-[11px] font-semibold text-accent underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => onChange([photo, ...photos.filter((item) => item.id !== photo.id)])} type="button">
                  Make cover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
