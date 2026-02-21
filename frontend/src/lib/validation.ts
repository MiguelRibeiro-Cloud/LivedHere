import { z } from 'zod';

export const ratingSchema = z.number().int().min(1).max(5);

export const reviewInputSchema = z.object({
  buildingId: z.string().uuid(),
  languageTag: z.enum(['en', 'pt']).optional(),
  livedFromYear: z.number().int().min(1950).max(2100),
  livedToYear: z.number().int().min(1950).max(2100).nullable(),
  livedDurationMonths: z.number().int().min(1).max(600),
  peopleNoise: ratingSchema,
  animalNoise: ratingSchema,
  insulation: ratingSchema,
  pestIssues: ratingSchema,
  areaSafety: ratingSchema,
  neighbourhoodVibe: ratingSchema,
  outdoorSpaces: ratingSchema,
  parking: ratingSchema,
  buildingMaintenance: ratingSchema,
  constructionQuality: ratingSchema,
  comment: z.string().max(1500).optional().nullable(),
  captchaToken: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  trackingCode: z.string().optional(),
  editToken: z.string().optional()
});

export const reportInputSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(['PII', 'Harassment', 'FalseInfo', 'Spam', 'Other']),
  details: z.string().max(500).optional().nullable()
});

export const moderateInputSchema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'REMOVE']),
  message: z.string().max(1000).optional().nullable(),
  redactedComment: z.string().max(1500).optional().nullable()
});

export const searchSchema = z.object({
  q: z.string().default(''),
  minOverall: z.coerce.number().min(1).max(5).optional(),
  minPeopleNoise: z.coerce.number().min(1).max(5).optional(),
  minAnimalNoise: z.coerce.number().min(1).max(5).optional(),
  minInsulation: z.coerce.number().min(1).max(5).optional(),
  minPestIssues: z.coerce.number().min(1).max(5).optional(),
  minAreaSafety: z.coerce.number().min(1).max(5).optional(),
  minNeighbourhoodVibe: z.coerce.number().min(1).max(5).optional(),
  minOutdoorSpaces: z.coerce.number().min(1).max(5).optional(),
  minParking: z.coerce.number().min(1).max(5).optional(),
  minBuildingMaintenance: z.coerce.number().min(1).max(5).optional(),
  minConstructionQuality: z.coerce.number().min(1).max(5).optional(),
  minReviews: z.coerce.number().int().min(1).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  years: z.coerce.number().int().min(1).max(20).optional(),
  sort: z.enum(['most_reviews', 'highest_overall', 'most_recent']).default('most_recent')
});
