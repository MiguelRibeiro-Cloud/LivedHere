import { PrismaClient, AuthorBadge, AuthorType, ReviewStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL is required for seed');
  }

  const portugal = await prisma.country.upsert({
    where: { code: 'PT' },
    update: {},
    create: {
      code: 'PT',
      nameEn: 'Portugal',
      namePt: 'Portugal'
    }
  });

  const lisboa = await prisma.city.upsert({
    where: {
      id: 'seed-lisboa-city'
    },
    update: {},
    create: {
      id: 'seed-lisboa-city',
      countryId: portugal.id,
      name: 'Lisboa',
      normalizedName: normalize('Lisboa')
    }
  });

  const area = await prisma.area.upsert({
    where: {
      id: 'seed-alvalade-area'
    },
    update: {},
    create: {
      id: 'seed-alvalade-area',
      cityId: lisboa.id,
      name: 'Alvalade',
      normalizedName: normalize('Alvalade')
    }
  });

  const street = await prisma.street.upsert({
    where: { id: 'seed-rua-street' },
    update: {},
    create: {
      id: 'seed-rua-street',
      areaId: area.id,
      name: 'Rua de Exemplo',
      normalizedName: normalize('Rua de Exemplo')
    }
  });

  const segment = await prisma.streetSegment.upsert({
    where: { id: 'seed-segment-1' },
    update: {},
    create: {
      id: 'seed-segment-1',
      streetId: street.id,
      startNumber: 1,
      endNumber: 100
    }
  });

  const building = await prisma.building.upsert({
    where: {
      streetId_streetNumber: {
        streetId: street.id,
        streetNumber: 10
      }
    },
    update: {},
    create: {
      streetId: street.id,
      segmentId: segment.id,
      streetNumber: 10,
      lat: 38.757365,
      lng: -9.148911,
      buildingName: 'Prédio Exemplo'
    }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { role: UserRole.ADMIN },
    create: {
      email: adminEmail.toLowerCase(),
      role: UserRole.ADMIN,
      displayName: 'Admin'
    }
  });

  await prisma.review.upsert({
    where: { trackingCode: 'DEMO-APPROVED-1' },
    update: {},
    create: {
      buildingId: building.id,
      authorType: AuthorType.USER,
      authorUserId: adminUser.id,
      authorBadge: AuthorBadge.VERIFIED_ACCOUNT,
      status: ReviewStatus.APPROVED,
      trackingCode: 'DEMO-APPROVED-1',
      livedFromYear: 2022,
      livedToYear: 2024,
      livedDurationMonths: 24,
      peopleNoise: 4,
      animalNoise: 4,
      insulation: 3,
      pestIssues: 4,
      areaSafety: 4,
      neighbourhoodVibe: 5,
      outdoorSpaces: 4,
      parking: 3,
      buildingMaintenance: 3,
      constructionQuality: 3,
      overallScore: 3.7,
      overallScoreRounded: 3.7,
      comment: 'Good location and calm nights. Some maintenance delays.',
      piiFlagged: false,
      piiReasons: [],
      approvedAt: new Date(),
      lastModerationAction: 'APPROVE',
      moderatedByUserId: adminUser.id
    }
  });

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
