// A venue page with no current specials, no events and no menu says only "No current specials
// on file". Thousands of those make the site look templated to Google, so they are served with
// noindex until the venue has something on them. They stay live and linkable; the tag drops off
// by itself the moment a special, event or menu item appears.
export function isThinVenuePage(counts: { specials: number; events: number; menuItems: number }): boolean {
  return counts.specials === 0 && counts.events === 0 && counts.menuItems === 0;
}
