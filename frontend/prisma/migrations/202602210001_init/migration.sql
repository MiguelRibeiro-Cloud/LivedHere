CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AuthorType" AS ENUM ('ANONYMOUS', 'USER');
CREATE TYPE "AuthorBadge" AS ENUM ('NONE', 'VERIFIED_ACCOUNT');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'REMOVED');
CREATE TYPE "ModerationAction" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'REMOVE');
CREATE TYPE "ReviewEditorType" AS ENUM ('AUTHOR', 'ADMIN');
CREATE TYPE "ReporterType" AS ENUM ('ANONYMOUS', 'USER');
CREATE TYPE "ReportReason" AS ENUM ('PII', 'Harassment', 'FalseInfo', 'Spam', 'Other');
CREATE TYPE "RateLimitEventType" AS ENUM ('REVIEW_SUBMISSION');

CREATE TABLE "User" (
	"id" TEXT PRIMARY KEY,
	"email" TEXT NOT NULL UNIQUE,
	"role" "UserRole" NOT NULL DEFAULT 'USER',
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"deletedAt" TIMESTAMP(3),
	"displayName" TEXT,
	"localePreference" TEXT
);

CREATE TABLE "Session" (
	"id" TEXT PRIMARY KEY,
	"userId" TEXT NOT NULL,
	"tokenHash" TEXT NOT NULL UNIQUE,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MagicLinkToken" (
	"id" TEXT PRIMARY KEY,
	"email" TEXT NOT NULL,
	"tokenHash" TEXT NOT NULL UNIQUE,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"expiresAt" TIMESTAMP(3) NOT NULL,
	"usedAt" TIMESTAMP(3),
	"ip" TEXT,
	"userAgent" TEXT
);

CREATE TABLE "Country" (
	"id" TEXT PRIMARY KEY,
	"code" TEXT NOT NULL UNIQUE,
	"nameEn" TEXT NOT NULL,
	"namePt" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "City" (
	"id" TEXT PRIMARY KEY,
	"countryId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"normalizedName" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Area" (
	"id" TEXT PRIMARY KEY,
	"cityId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"normalizedName" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Street" (
	"id" TEXT PRIMARY KEY,
	"areaId" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"normalizedName" TEXT NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "StreetSegment" (
	"id" TEXT PRIMARY KEY,
	"streetId" TEXT NOT NULL,
	"startNumber" INTEGER NOT NULL,
	"endNumber" INTEGER NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Building" (
	"id" TEXT PRIMARY KEY,
	"streetId" TEXT NOT NULL,
	"segmentId" TEXT NOT NULL,
	"streetNumber" INTEGER NOT NULL,
	"buildingName" TEXT,
	"lat" DECIMAL(10,7),
	"lng" DECIMAL(10,7),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE ("streetId", "streetNumber")
);

CREATE TABLE "Review" (
	"id" TEXT PRIMARY KEY,
	"buildingId" TEXT NOT NULL,
	"authorUserId" TEXT,
	"authorType" "AuthorType" NOT NULL,
	"authorBadge" "AuthorBadge" NOT NULL DEFAULT 'NONE',
	"status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
	"trackingCode" TEXT NOT NULL UNIQUE,
	"editTokenHash" TEXT,
	"editTokenExpiresAt" TIMESTAMP(3),
	"languageTag" TEXT,
	"livedFromYear" INTEGER NOT NULL,
	"livedToYear" INTEGER,
	"livedDurationMonths" INTEGER NOT NULL,
	"peopleNoise" INTEGER NOT NULL,
	"animalNoise" INTEGER NOT NULL,
	"insulation" INTEGER NOT NULL,
	"pestIssues" INTEGER NOT NULL,
	"areaSafety" INTEGER NOT NULL,
	"neighbourhoodVibe" INTEGER NOT NULL,
	"outdoorSpaces" INTEGER NOT NULL,
	"parking" INTEGER NOT NULL,
	"buildingMaintenance" INTEGER NOT NULL,
	"constructionQuality" INTEGER NOT NULL,
	"overallScore" DECIMAL(3,2) NOT NULL,
	"overallScoreRounded" DECIMAL(2,1) NOT NULL,
	"comment" TEXT,
	"piiFlagged" BOOLEAN NOT NULL DEFAULT false,
	"piiReasons" TEXT[] NOT NULL,
	"submitIp" TEXT,
	"submitFingerprint" TEXT,
	"contactEmail" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	"approvedAt" TIMESTAMP(3),
	"removedAt" TIMESTAMP(3),
	"lastModerationAction" "ModerationAction",
	"moderationMessage" TEXT,
	"moderatedByUserId" TEXT
);

CREATE TABLE "ReviewEditHistory" (
	"id" TEXT PRIMARY KEY,
	"reviewId" TEXT NOT NULL,
	"editorType" "ReviewEditorType" NOT NULL,
	"beforeJson" JSONB NOT NULL,
	"afterJson" JSONB NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Report" (
	"id" TEXT PRIMARY KEY,
	"reviewId" TEXT NOT NULL,
	"reporterType" "ReporterType" NOT NULL,
	"reporterUserId" TEXT,
	"reason" "ReportReason" NOT NULL,
	"details" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"resolvedAt" TIMESTAMP(3),
	"resolvedByUserId" TEXT,
	"resolutionNote" TEXT
);

CREATE TABLE "RateLimitEvent" (
	"id" TEXT PRIMARY KEY,
	"ip" TEXT,
	"fingerprint" TEXT,
	"buildingId" TEXT,
	"type" "RateLimitEventType" NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ModerationAudit" (
	"id" TEXT PRIMARY KEY,
	"reviewId" TEXT NOT NULL,
	"actorUserId" TEXT NOT NULL,
	"action" "ModerationAction" NOT NULL,
	"message" TEXT,
	"beforeJson" JSONB,
	"afterJson" JSONB,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");
CREATE INDEX "MagicLinkToken_expiresAt_idx" ON "MagicLinkToken"("expiresAt");
CREATE INDEX "City_countryId_normalizedName_idx" ON "City"("countryId", "normalizedName");
CREATE INDEX "Area_cityId_normalizedName_idx" ON "Area"("cityId", "normalizedName");
CREATE INDEX "Street_areaId_normalizedName_idx" ON "Street"("areaId", "normalizedName");
CREATE INDEX "StreetSegment_streetId_startNumber_endNumber_idx" ON "StreetSegment"("streetId", "startNumber", "endNumber");
CREATE INDEX "Building_lat_lng_idx" ON "Building"("lat", "lng");
CREATE INDEX "Review_buildingId_status_idx" ON "Review"("buildingId", "status");
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
CREATE INDEX "Review_overallScore_idx" ON "Review"("overallScore");
CREATE INDEX "Review_submitIp_createdAt_idx" ON "Review"("submitIp", "createdAt");
CREATE INDEX "Review_submitFingerprint_createdAt_idx" ON "Review"("submitFingerprint", "createdAt");
CREATE INDEX "ReviewEditHistory_reviewId_createdAt_idx" ON "ReviewEditHistory"("reviewId", "createdAt");
CREATE INDEX "Report_reviewId_idx" ON "Report"("reviewId");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_resolvedAt_idx" ON "Report"("resolvedAt");
CREATE INDEX "RateLimitEvent_type_createdAt_idx" ON "RateLimitEvent"("type", "createdAt");
CREATE INDEX "RateLimitEvent_ip_createdAt_idx" ON "RateLimitEvent"("ip", "createdAt");
CREATE INDEX "RateLimitEvent_fingerprint_createdAt_idx" ON "RateLimitEvent"("fingerprint", "createdAt");
CREATE INDEX "RateLimitEvent_buildingId_createdAt_idx" ON "RateLimitEvent"("buildingId", "createdAt");
CREATE INDEX "ModerationAudit_reviewId_createdAt_idx" ON "ModerationAudit"("reviewId", "createdAt");

CREATE INDEX "city_name_trgm_idx" ON "City" USING gin ("name" gin_trgm_ops);
CREATE INDEX "area_name_trgm_idx" ON "Area" USING gin ("name" gin_trgm_ops);
CREATE INDEX "street_name_trgm_idx" ON "Street" USING gin ("name" gin_trgm_ops);

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Area" ADD CONSTRAINT "Area_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Street" ADD CONSTRAINT "Street_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StreetSegment" ADD CONSTRAINT "StreetSegment_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "StreetSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewEditHistory" ADD CONSTRAINT "ReviewEditHistory_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAudit" ADD CONSTRAINT "ModerationAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
