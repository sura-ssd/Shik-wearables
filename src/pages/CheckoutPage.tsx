import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormRegister } from "react-hook-form";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useCartStore } from "../store/cartStore";
import { formatPrice } from "../utils/formatPrice";

const ethiopianPhonePattern = /^(?:(?:\+251|251)(?:9|7)\d{8}|0(?:9|7)\d{8})$/;

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => ethiopianPhonePattern.test(value.replace(/[\s()-]/g, "")),
      "Enter a valid Ethiopian mobile number.",
    ),
  city: z.string().trim().min(2, "Enter your city or area."),
  address: z.string().trim().min(6, "Enter a more complete delivery address."),
  deliveryNote: z.string().trim().max(240, "Keep the note under 240 characters."),
});

type CheckoutDetails = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const [step, setStep] = useState<"shipping" | "review">("shipping");
  const [shippingDetails, setShippingDetails] = useState<CheckoutDetails | null>(null);
  const items = useCartStore((state) => state.items);
  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CheckoutDetails>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      city: "Addis Ababa",
      address: "",
      deliveryNote: "",
    },
  });

  function reviewOrder(details: CheckoutDetails) {
    setShippingDetails(details);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-content px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="text-3xl font-extrabold tracking-tightest text-ink">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">Add something from the collection before checking out.</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Shik shop</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tightest text-ink">Checkout</h1>
        </div>
        <ol aria-label="Checkout progress" className="mt-5 flex items-center gap-3 text-sm sm:mt-0">
          <li aria-current={step === "shipping" ? "step" : undefined} className={step === "shipping" ? "font-semibold text-ink" : "text-muted"}>
            <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">1</span>
            Shipping
          </li>
          <li aria-hidden="true" className="h-px w-6 bg-border" />
          <li aria-current={step === "review" ? "step" : undefined} className={step === "review" ? "font-semibold text-ink" : "text-muted"}>
            <span className={`mr-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${step === "review" ? "bg-accent text-accent-ink" : "bg-surface text-muted"}`}>2</span>
            Review
          </li>
        </ol>
      </div>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <section aria-labelledby="checkout-step-heading">
          {step === "shipping" ? (
            <form className="space-y-7" noValidate onSubmit={handleSubmit(reviewOrder)}>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-ink" id="checkout-step-heading">Shipping details</h2>
                <p className="mt-2 text-sm leading-6 text-muted">We’ll use these details to confirm delivery options and fees with you.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field autoComplete="name" error={errors.fullName?.message} label="Full name" name="fullName" placeholder="Your name" register={register} />
                <Field autoComplete="tel" error={errors.phone?.message} hint="Use 09…, 07…, or +251…" label="Phone number" name="phone" placeholder="09 11 22 33 44" register={register} type="tel" />
                <Field autoComplete="address-level2" error={errors.city?.message} label="City or area" name="city" placeholder="Addis Ababa" register={register} />
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="address">Delivery address</label>
                  <textarea
                    aria-describedby={errors.address ? "address-error" : undefined}
                    aria-invalid={Boolean(errors.address)}
                    autoComplete="street-address"
                    className="min-h-28 w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    id="address"
                    placeholder="Street, building, neighborhood, and helpful directions"
                    {...register("address")}
                  />
                  {errors.address?.message && <p className="mt-1.5 text-sm text-danger" id="address-error">{errors.address.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="deliveryNote">Delivery note <span className="font-normal text-muted">(optional)</span></label>
                  <textarea
                    aria-describedby={errors.deliveryNote ? "delivery-note-error" : undefined}
                    aria-invalid={Boolean(errors.deliveryNote)}
                    className="min-h-20 w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
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
                  <h2 className="text-xl font-bold tracking-tight text-ink" id="checkout-step-heading">Review your details</h2>
                  <p className="mt-2 text-sm text-muted">Check your contact and delivery information.</p>
                </div>
                <button className="text-sm font-semibold text-accent underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" onClick={() => setStep("shipping")} type="button">
                  Edit details
                </button>
              </div>

              {shippingDetails && (
                <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface px-5">
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Contact</dt>
                    <dd className="mt-2 text-sm font-medium text-ink">{shippingDetails.fullName}</dd>
                    <dd className="mt-1 text-sm text-muted">{shippingDetails.phone}</dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Delivery address</dt>
                    <dd className="mt-2 flex gap-2 text-sm leading-6 text-ink">
                      <MapPin aria-hidden="true" className="mt-1 shrink-0 text-muted" size={16} />
                      <span>{shippingDetails.address}, {shippingDetails.city}</span>
                    </dd>
                    {shippingDetails.deliveryNote && <dd className="mt-2 text-sm text-muted">Note: {shippingDetails.deliveryNote}</dd>}
                  </div>
                </dl>
              )}

              <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
                <div className="flex gap-3">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-muted" size={19} />
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Payment is not available yet</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">Your order has not been placed or charged. Payment and delivery fees will be available once checkout is connected to the shop’s payment service.</p>
                  </div>
                </div>
              </div>

              <button className="mt-6 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-border px-6 text-sm font-semibold text-muted sm:w-auto" disabled type="button">
                Continue to payment <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          )}
        </section>

        <aside aria-labelledby="order-summary-heading" className="h-fit rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold tracking-tight text-ink" id="order-summary-heading">Order summary</h2>
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li className="flex gap-3 py-4" key={`${item.product.id}-${item.size}`}>
                <img alt={item.product.imageAlt} className="size-16 shrink-0 rounded-xl bg-canvas object-cover" height="128" loading="lazy" src={item.product.image} width="128" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.product.name}</p>
                  <p className="mt-1 text-xs text-muted">Size {item.size} · Qty {item.quantity}</p>
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
              <dt className="text-muted">Delivery</dt>
              <dd className="text-right text-muted">Confirmed before payment</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">Delivery coverage and fees depend on your address and are not included in this subtotal.</p>
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
  name: "fullName" | "phone" | "city";
  placeholder: string;
  register: UseFormRegister<CheckoutDetails>;
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
        className="min-h-12 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
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