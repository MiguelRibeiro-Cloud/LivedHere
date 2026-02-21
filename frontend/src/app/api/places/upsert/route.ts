import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizeText } from '@/lib/utils';
import { assertSameOrigin } from '@/lib/security/csrf';

const schema = z.object({
  countryCode: z.string().min(2),
  city: z.string().min(1),
  area: z.string().min(1),
  street: z.string().min(1),
  streetNumber: z.number().int().min(1).max(99999),
  segmentStart: z.number().int().min(1).max(99999),
  segmentEnd: z.number().int().min(1).max(99999),
  buildingName: z.string().max(120).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable()
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const body = schema.parse(await request.json());

  if (body.segmentStart > body.segmentEnd) {
    return NextResponse.json({ error: 'Street segment start must be <= end' }, { status: 400 });
  }

  const country = await prisma.country.findUnique({ where: { code: body.countryCode.toUpperCase() } });
  if (!country) {
    return NextResponse.json({ error: 'Country not found. Country creation is admin-only.' }, { status: 400 });
  }

  const city = await prisma.city.upsert({
    where: {
      id: `${country.id}:${normalizeText(body.city)}`
    },
    update: {},
    create: {
      id: `${country.id}:${normalizeText(body.city)}`,
      countryId: country.id,
      name: body.city,
      normalizedName: normalizeText(body.city)
    }
  });

  const area = await prisma.area.upsert({
    where: {
      id: `${city.id}:${normalizeText(body.area)}`
    },
    update: {},
    create: {
      id: `${city.id}:${normalizeText(body.area)}`,
      cityId: city.id,
      name: body.area,
      normalizedName: normalizeText(body.area)
    }
  });

  const street = await prisma.street.upsert({
    where: {
      id: `${area.id}:${normalizeText(body.street)}`
    },
    update: {},
    create: {
      id: `${area.id}:${normalizeText(body.street)}`,
      areaId: area.id,
      name: body.street,
      normalizedName: normalizeText(body.street)
    }
  });

  const overlapping = await prisma.streetSegment.findFirst({
    where: {
      streetId: street.id,
      AND: [{ startNumber: { lte: body.segmentEnd } }, { endNumber: { gte: body.segmentStart } }]
    }
  });

  if (overlapping && !(overlapping.startNumber === body.segmentStart && overlapping.endNumber === body.segmentEnd)) {
    return NextResponse.json({ error: 'Street segment overlaps an existing segment.' }, { status: 400 });
  }

  const segment =
    overlapping ||
    (await prisma.streetSegment.create({
      data: {
        streetId: street.id,
        startNumber: body.segmentStart,
        endNumber: body.segmentEnd
      }
    }));

  if (body.streetNumber < segment.startNumber || body.streetNumber > segment.endNumber) {
    return NextResponse.json({ error: 'Street number does not fit the provided segment.' }, { status: 400 });
  }

  const building = await prisma.building.upsert({
    where: {
      streetId_streetNumber: {
        streetId: street.id,
        streetNumber: body.streetNumber
      }
    },
    update: {
      segmentId: segment.id,
      buildingName: body.buildingName || undefined,
      lat: body.lat ?? undefined,
      lng: body.lng ?? undefined
    },
    create: {
      streetId: street.id,
      segmentId: segment.id,
      streetNumber: body.streetNumber,
      buildingName: body.buildingName || null,
      lat: body.lat ?? null,
      lng: body.lng ?? null
    }
  });

  return NextResponse.json({
    building: {
      id: building.id,
      streetNumber: building.streetNumber,
      streetName: street.name,
      area: area.name,
      city: city.name
    }
  });
}
