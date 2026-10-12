// Button taps on a venue page, recorded as analytics events so an owner can be shown
// "N people tapped directions". The page tags each button with data-venue-action; only
// names on this list are ever sent, so markup cannot invent event types.
export const VENUE_ACTION_EVENTS = {
  directions: "venue_directions_click",
  website: "venue_website_click",
  menu: "venue_menu_click",
  phone: "venue_phone_click",
  reviews: "venue_reviews_click",
  claim: "venue_claim_click",
} as const;

export function venueActionEvent(action: string | null | undefined): string | null {
  if (!action || !Object.prototype.hasOwnProperty.call(VENUE_ACTION_EVENTS, action)) return null;
  return VENUE_ACTION_EVENTS[action as keyof typeof VENUE_ACTION_EVENTS];
}
