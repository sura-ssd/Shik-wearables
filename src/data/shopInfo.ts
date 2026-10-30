/**
 * Details about the shop that appear in the footer and in the policy pages.
 * Change them here and they update everywhere.
 */
export const SHOP = {
  name: "Shik",
  // Replace with your real contact details.
  email: "hello@shikshop.com",
  phone: "+251 91 234 5678",
  deliveryArea: "Addis Ababa",
  // An order nobody confirms within this many hours is cancelled automatically (set in the database).
  confirmationHours: 24,
  // How many days after delivery a customer can ask to return an item.
  returnDays: 3,
  // How many open orders one account can have at once (set in the database).
  maxOpenOrders: 3,
  policiesUpdated: "October 2026",
} as const;
