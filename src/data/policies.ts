import { SHOP } from "./shopInfo";

export type PolicySlug = "delivery" | "returns" | "privacy" | "terms";

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface Policy {
  slug: PolicySlug;
  title: string;
  intro: string;
  sections: PolicySection[];
}

// These are plain-language starting points. Read them through and change anything that does not match
// how you really work, and ask a lawyer to review them before you rely on them.
export const POLICIES: Record<PolicySlug, Policy> = {
  delivery: {
    slug: "delivery",
    title: "Delivery and payment",
    intro: `We deliver in ${SHOP.deliveryArea}. Delivery is free, and you pay in cash when your order arrives.`,
    sections: [
      {
        heading: "Where we deliver",
        paragraphs: [
          `We deliver to the sub-cities of ${SHOP.deliveryArea} listed at checkout. We do not deliver outside ${SHOP.deliveryArea} at the moment.`,
        ],
      },
      {
        heading: "Delivery fee",
        paragraphs: ["Delivery is free. The price you see is the price you pay."],
      },
      {
        heading: "How your order works",
        bullets: [
          "You choose your items and place your order. You do not pay online.",
          "We phone you on the number you gave us to confirm your order and your address.",
          "We send your order out for delivery.",
          "You check your items and pay in cash when they arrive.",
        ],
      },
      {
        heading: "Confirming your order",
        paragraphs: [
          "We confirm every order by phone, so please answer our call. Your items are held for you while we confirm.",
          `If we cannot confirm your order within ${SHOP.confirmationHours} hours, it is cancelled automatically and the items go back on sale. You can cancel your own order from the My orders page until we confirm it. After that, please call us.`,
        ],
      },
      {
        heading: "Delivery time",
        paragraphs: ["We tell you when to expect your order during the confirmation call."],
      },
      {
        heading: "Paying",
        paragraphs: ["You pay in Ethiopian birr (ETB), in cash, to the person delivering your order. Please have the amount ready."],
      },
      {
        heading: "If we cannot reach you",
        paragraphs: [
          "If nobody answers at the delivery address or on the phone, the delivery is marked as failed and the items go back on sale.",
          `To keep things fair for everyone, an account can have up to ${SHOP.maxOpenOrders} open orders at a time. If deliveries to an account fail twice within 90 days, we may pause new orders from that account until we have spoken.`,
        ],
      },
    ],
  },

  returns: {
    slug: "returns",
    title: "Returns and exchanges",
    intro: `Check your order when it arrives. If something is not right, tell us within ${SHOP.returnDays} days of delivery.`,
    sections: [
      {
        heading: "Check your order on delivery",
        paragraphs: ["Please look at your items when they arrive, before the delivery person leaves, and make sure they are the ones you ordered."],
      },
      {
        heading: "Returns and exchanges",
        paragraphs: [
          `You can ask to return or exchange an item within ${SHOP.returnDays} days of delivery if it is unworn, unwashed, and has its tags and original packaging.`,
          "An exchange for another size or color depends on what we have in stock.",
        ],
      },
      {
        heading: "Items we cannot take back",
        bullets: [
          "Items that have been worn, washed, or damaged after delivery.",
          "Items without their tags or packaging.",
          "Socks and similar items for hygiene reasons, once they are opened.",
        ],
      },
      {
        heading: "Wrong or faulty items",
        paragraphs: ["If we sent the wrong item, or it has a fault, contact us as soon as you can. We will replace it or refund you at no cost to you."],
      },
      {
        heading: "How to return an item",
        bullets: [
          `Call or email us with your order number (you will find it on the My orders page) within ${SHOP.returnDays} days of delivery.`,
          "We will arrange to collect the item from you in Addis Ababa.",
          "When we collect it, we will give you a replacement or agree with you how to refund you.",
        ],
      },
    ],
  },

  privacy: {
    slug: "privacy",
    title: "Privacy",
    intro: `We keep your information private and use it only to run your orders. This page explains what we collect and why.`,
    sections: [
      {
        heading: "What we collect",
        bullets: [
          "Your name, email address, and phone number.",
          "Your delivery address and any delivery note you write.",
          "Your orders, and the items in your cart.",
          "Your password. It is stored securely by our sign-in provider, and we cannot read it.",
        ],
      },
      {
        heading: "How we use it",
        bullets: [
          "To confirm and deliver your orders, and to phone you about them.",
          "To keep your cart safe in your account, so it is there when you sign back in.",
          "To protect the shop from fake orders and abuse.",
          "To send you account emails, such as a password reset link.",
        ],
      },
      {
        heading: "Who can see it",
        paragraphs: [
          "Only our team can see your orders and contact details. We do not sell your information, and we do not share it for advertising.",
          "We use trusted services to run the shop. Our website, database, and sign-in are hosted by Supabase. When you place an order, we also receive a private message on Telegram that includes your name, phone number, and delivery address, so that we can confirm your order quickly.",
        ],
      },
      {
        heading: "Cookies and storage on your device",
        paragraphs: ["We store a few things in your browser so the site works: your cart, your light or dark mode choice, and your sign-in. We do not use advertising or tracking cookies."],
      },
      {
        heading: "How long we keep it",
        paragraphs: ["We keep your account while it is open, and your order records for as long as we need them to run the shop and answer questions about past orders."],
      },
      {
        heading: "Your choices",
        paragraphs: [`You can ask us to correct or delete your information by contacting us at ${SHOP.email} or ${SHOP.phone}. Orders that are already being delivered, or are needed for our records, may have to be kept.`],
      },
    ],
  },

  terms: {
    slug: "terms",
    title: "Terms of use",
    intro: `By using this site and placing an order, you agree to these terms.`,
    sections: [
      {
        heading: "Prices and availability",
        paragraphs: [
          "All prices are in Ethiopian birr (ETB). Items are sold while stock lasts.",
          "If we find a mistake in a price or in availability, we will contact you before your order goes out, and you can choose to continue or cancel.",
        ],
      },
      {
        heading: "Your order",
        paragraphs: [
          "Placing an order is a request to buy. It becomes a sale when we confirm it with you by phone. We may decline or cancel an order, for example if we cannot reach you, or if an item is not available.",
          `You can cancel an order yourself until we confirm it. An order that is not confirmed within ${SHOP.confirmationHours} hours is cancelled automatically.`,
        ],
      },
      {
        heading: "Payment",
        paragraphs: ["You pay in cash, in ETB, when your order is delivered. Delivery inside Addis Ababa is free."],
      },
      {
        heading: "Fake or repeated failed orders",
        paragraphs: [
          "Please order only what you intend to receive and pay for. We may limit or pause an account that places fake orders, or that has repeated failed deliveries.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "Give us correct information, especially your phone number and address, and keep your password private. You are responsible for what is done with your account.",
        ],
      },
      {
        heading: "Returns",
        paragraphs: ["Returns and exchanges are covered on the Returns and exchanges page."],
      },
      {
        heading: "Our responsibility",
        paragraphs: [
          "We work hard to describe our products accurately, but colors can look slightly different on different screens. To the extent the law allows, our responsibility for any order is limited to the price of the items in that order.",
        ],
      },
      {
        heading: "Changes and law",
        paragraphs: [
          "We may update these terms, and the date at the top of the page will change when we do. These terms are governed by the laws of Ethiopia.",
        ],
      },
    ],
  },
};

export const POLICY_LIST: Policy[] = [POLICIES.delivery, POLICIES.returns, POLICIES.privacy, POLICIES.terms];

export function isPolicySlug(value: string | undefined): value is PolicySlug {
  return value !== undefined && Object.prototype.hasOwnProperty.call(POLICIES, value);
}
