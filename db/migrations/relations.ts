import { relations } from "drizzle-orm/relations";
import { regionsInSpecials, venuesInSpecials, scrapeRunsInSpecials, inboundEmailsInSpecials, outreachSendsInSpecials, specialsInSpecials, menuItemsInSpecials, eventsInSpecials, submissionsInSpecials, bookingsInSpecials, venuePhotosInSpecials, monetizationSettingsInSpecials } from "./schema";

export const venuesInSpecialsRelations = relations(venuesInSpecials, ({one, many}) => ({
	regionsInSpecial: one(regionsInSpecials, {
		fields: [venuesInSpecials.regionId],
		references: [regionsInSpecials.id]
	}),
	scrapeRunsInSpecials: many(scrapeRunsInSpecials),
	inboundEmailsInSpecials: many(inboundEmailsInSpecials),
	outreachSendsInSpecials: many(outreachSendsInSpecials),
	specialsInSpecials: many(specialsInSpecials),
	menuItemsInSpecials: many(menuItemsInSpecials),
	eventsInSpecials: many(eventsInSpecials),
	submissionsInSpecials: many(submissionsInSpecials),
	bookingsInSpecials: many(bookingsInSpecials),
	venuePhotosInSpecials: many(venuePhotosInSpecials),
}));

export const regionsInSpecialsRelations = relations(regionsInSpecials, ({many}) => ({
	venuesInSpecials: many(venuesInSpecials),
	specialsInSpecials: many(specialsInSpecials),
	eventsInSpecials: many(eventsInSpecials),
	monetizationSettingsInSpecials: many(monetizationSettingsInSpecials),
}));

export const scrapeRunsInSpecialsRelations = relations(scrapeRunsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [scrapeRunsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
}));

export const inboundEmailsInSpecialsRelations = relations(inboundEmailsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [inboundEmailsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
}));

export const outreachSendsInSpecialsRelations = relations(outreachSendsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [outreachSendsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
}));

export const specialsInSpecialsRelations = relations(specialsInSpecials, ({one, many}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [specialsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
	regionsInSpecial: one(regionsInSpecials, {
		fields: [specialsInSpecials.regionId],
		references: [regionsInSpecials.id]
	}),
	bookingsInSpecials: many(bookingsInSpecials),
}));

export const menuItemsInSpecialsRelations = relations(menuItemsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [menuItemsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
}));

export const eventsInSpecialsRelations = relations(eventsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [eventsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
	regionsInSpecial: one(regionsInSpecials, {
		fields: [eventsInSpecials.regionId],
		references: [regionsInSpecials.id]
	}),
}));

export const submissionsInSpecialsRelations = relations(submissionsInSpecials, ({one, many}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [submissionsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
	venuePhotosInSpecials: many(venuePhotosInSpecials),
}));

export const bookingsInSpecialsRelations = relations(bookingsInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [bookingsInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
	specialsInSpecial: one(specialsInSpecials, {
		fields: [bookingsInSpecials.specialId],
		references: [specialsInSpecials.id]
	}),
}));

export const venuePhotosInSpecialsRelations = relations(venuePhotosInSpecials, ({one}) => ({
	venuesInSpecial: one(venuesInSpecials, {
		fields: [venuePhotosInSpecials.venueId],
		references: [venuesInSpecials.id]
	}),
	submissionsInSpecial: one(submissionsInSpecials, {
		fields: [venuePhotosInSpecials.submissionId],
		references: [submissionsInSpecials.id]
	}),
}));

export const monetizationSettingsInSpecialsRelations = relations(monetizationSettingsInSpecials, ({one}) => ({
	regionsInSpecial: one(regionsInSpecials, {
		fields: [monetizationSettingsInSpecials.regionId],
		references: [regionsInSpecials.id]
	}),
}));