import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormRegister } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Banknote, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dropdown } from "../components/Dropdown";
import { placeOrder } from "../lib/orders";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { toast } from "../store/toastStore";
import { SUB_CITIES } from "../utils/addis";
import { cartLineKey } from "../utils/cartLine";
import { formatPrice } from "../utils/formatPrice";

const ethiopianPhonePattern = /^(?:(?:\+251|251)(?:9|7)\d{8}|0(?:9|7)\d{8})$/;

const orderSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => ethiopianPhonePattern.test(value.replace(/[\s()-]/g, "")),
      "Enter a valid Ethiopian mobile number.",
    ),
  subCity: z
    .string()
    .refine((value) => (SUB_CITIES as readonly string[]).includes(value), "Choose your sub-city."),
  address: z.string().trim().min(6, "Enter a more complete delivery address."),
  deliveryNote: z.string().trim().max(240, "Keep the note under 240 characters."),
});

type OrderDetails = z.infer<typeof orderSchema>;

const inputClass =
  "min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";
const textareaClass =
  "w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function CheckoutPage() {
  const [step, setStep] = useState<"details" | "review">("details");
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const isRestoring = useCartStore((state) => state.isRestoring);
  const clearCart = useCartStore((state) => state.clearCart);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<OrderDetails>({
    resolver: zodResolver(orderSchema),
    defaultValues: { fullName: "", phone: "", subCity: "", address: "", deliveryNote: "" },
  });

  function reviewOrder(values: OrderDetails) {
    setDetails(values);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handlePlaceOrder() {
    if (!details || isPlacing) return;
    setIsPlacing(true);
    setOrderError(null);

    try {
      const orderId = await placeOrder(items, details);
      clearCart();
      toast.success("Order placed", "We will call you soon to confirm it.");
      navigate(`/orders/${orderId}`, { state: { justPlaced: true }, replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setOrderError(message);
      toast.error("Couldn't place your order", message);
      setIsPlacing(false);
    }
  }

  if (isRestoring && items.length === 0) {
    return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Restoring your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">Add something from the collection before placing an order.</p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/#shop"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Back to the shop
        </Link>
      </section>
    );
  }

  if (authLoading) {
    return <p className="px-4 py-24 text-center text-sm text-muted" role="status">Loading…</p>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Sign in to place your order</h1>
        <p className="mt-3 text-sm text-muted">Your cart is saved. Sign in or create an account to order.</p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          to="/login?redirect=/checkout"
        >
          Sign in or create account
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <Link
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        to="/#shop"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Continue shopping
      </Link>

      <div className="mt-5 border-b border-border pb-6 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Shik wearables</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tightest text-ink">Place your order</h1>
        </div>
        <ol aria-label="Order progress" className="mt-5 flex items-center gap-3 text-sm sm:mt-0">
          <li aria-current={step === "details" ? "step" : undefined} className={step === "details" ? "font-semibold text-ink" : "text-muted"}>
            <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">1</span>
            Delivery
          </li>
          <li aria-hidden="true" className="h-px w-6 bg-border" />
          <li aria-current={step === "review" ? "step" : undefined} className={step === "review" ? "font-semibold text-ink" : "text-muted"}>
            <span className={`mr-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${step === "review" ? "bg-accent text-accent-ink" : "bg-surface text-muted"}`}>2</span>
            Review
          </li>
        </ol>
      </div>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <section aria-labelledby="order-step-heading">
          {step === "details" ? (
            <form className="space-y-7" noValidate onSubmit={handleSubmit(reviewOrder)}>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-ink" id="order-step-heading">Delivery details</h2>
                <p className="mt-2 text-sm leading-6 text-muted">We deliver in Addis Ababa only, and delivery is free. We will call you to confirm your order.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field autoComplete="name" error={errors.fullName?.message} label="Full name" name="fullName" placeholder="Your name" register={register} />
                <Field autoComplete="tel" error={errors.phone?.message} hint="We will call this number. Use 09…, 07…, or +251…" label="Phone number" name="phone" placeholder="09 11 22 33 44" register={register} type="tel" />

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="subCity">Sub-city</label>
                  <Controller
                    control={control}
                    name="subCity"
                    render={({ field }) => (
                      <Dropdown
                        ariaLabel="Sub-city"
                        describedBy={errors.subCity ? "subCity-error" : undefined}
                        id="subCity"
                        invalid={Boolean(errors.subCity)}
                        large
                        onChange={field.onChange}
                        options={[
                          { value: "", label: "Choose your sub-city" },
                          ...SUB_CITIES.map((subCity) => ({ value: subCity, label: subCity })),
                        ]}
                        value={field.value}
                      />
                    )}
                  />
                  {errors.subCity?.message && <p className="mt-1.5 text-sm text-danger" id="subCity-error">{errors.subCity.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="address">Delivery address</label>
                  <textarea
                    aria-describedby={errors.address ? "address-error" : undefined}
                    aria-invalid={Boolean(errors.address)}
                    autoComplete="street-address"
                    className={`${textareaClass} min-h-28`}
                    id="address"
                    placeholder="Neighborhood, street, building, house number, and a nearby landmark"
                    {...register("address")}
                  />
                  {errors.address?.message && <p className="mt-1.5 text-sm text-danger" id="address-error">{errors.address.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="deliveryNote">Delivery note <span className="font-normal text-muted">(optional)</span></label>
                  <textarea
                    aria-describedby={errors.deliveryNote ? "delivery-note-error" : undefined}
                    aria-invalid={Boolean(errors.deliveryNote)}
                    className={`${textareaClass} min-h-20`}
                    id="deliveryNote"
                    placeholder="Anything that will help us find you?"
                    {...register("deliveryNote")}
                  />
                  {errors.deliveryNote?.message && <p className="mt-1.5 text-sm text-danger" id="delivery-note-error">{errors.deliveryNote.message}</p>}
                </div>
              </div>

              <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto" type="submit">
                Review order <ArrowRight aria-hidden="true" size={17} />
              </button>
            </form>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-ink" id="order-step-heading">Review your order</h2>
                  <p className="mt-2 text-sm text-muted">Check your contact and delivery details.</p>
                </div>
                <button className="text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" disabled={isPlacing} onClick={() => setStep("details")} type="button">
                  Edit details
                </button>
              </div>

              {details && (
                <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-5">
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Contact</dt>
                    <dd className="mt-2 text-sm font-medium text-ink">{details.fullName}</dd>
                    <dd className="mt-1 text-sm text-muted">{details.phone}</dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Delivery address</dt>
                    <dd className="mt-2 flex gap-2 text-sm leading-6 text-ink">
                      <MapPin aria-hidden="true" className="mt-1 shrink-0 text-muted" size={16} />
                      <span>{details.address}, {details.subCity}, Addis Ababa</span>
                    </dd>
                    {details.deliveryNote && <dd className="mt-2 text-sm text-muted">Note: {details.deliveryNote}</dd>}
                  </div>
                </dl>
              )}

              <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
                <div className="flex gap-3">
                  <Banknote aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={19} />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Pay in cash on delivery</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      You pay {formatPrice(subtotal)} in cash when your order arrives. Delivery is free. Your items are reserved for you while we confirm your order by phone.
                    </p>
                  </div>
                </div>
              </div>

              {orderError && <p className="mt-4 text-sm text-danger" role="alert">{orderError}</p>}

              <button
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-border disabled:text-muted sm:w-auto"
                disabled={isPlacing}
                onClick={() => void handlePlaceOrder()}
                type="button"
              >
                {isPlacing ? "Placing your order…" : "Place order"} <ArrowRight aria-hidden="true" size={17} />
              </button>
              <p className="mt-4 text-xs leading-5 text-muted">
                By placing an order you agree to our{" "}
                <Link className="font-semibold text-accent underline underline-offset-2" to="/policies/terms">terms</Link>{" "}
                and our{" "}
                <Link className="font-semibold text-accent underline underline-offset-2" to="/policies/delivery">delivery and payment</Link>{" "}
                and{" "}
                <Link className="font-semibold text-accent underline underline-offset-2" to="/policies/returns">returns</Link>{" "}
                policies.
              </p>
            </div>
          )}
        </section>

        <aside aria-labelledby="order-summary-heading" className="h-fit rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold tracking-tight text-ink" id="order-summary-heading">Order summary</h2>
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li className="flex gap-3 py-4" key={cartLineKey(item)}>
                <img alt={item.color?.imageAlt ?? item.product.imageAlt} className="size-16 shrink-0 rounded-xl bg-canvas object-contain" height="128" loading="lazy" src={item.color?.image ?? item.product.image} width="128" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.product.name}</p>
                  <p className="mt-1 text-xs text-muted">{item.color ? `${item.color.name} · ` : ""}Size {item.size} · Qty {item.quantity}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-ink">{formatPrice(item.product.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-semibold text-ink">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Delivery in Addis Ababa</dt>
              <dd className="font-semibold text-ink">Free</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold text-ink">Pay on delivery</dt>
              <dd className="font-bold text-ink">{formatPrice(subtotal)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

interface FieldProps {
  autoComplete: string;
  error?: string;
  hint?: string;
  label: string;
  name: "fullName" | "phone";
  placeholder: string;
  register: UseFormRegister<OrderDetails>;
  type?: string;
}

function Field({ autoComplete, error, hint, label, name, placeholder, register, type = "text" }: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor={name}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={inputClass}
        id={name}
        placeholder={placeholder}
        type={type}
        {...register(name)}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-danger" id={errorId}>{error}</p>}
    </div>
  );
}
