/**
 * Seed a rich, realistic demo project for synopsis generation testing.
 *
 * Creates:
 *   - Test consultant user
 *   - Client: "The Henderson Residence"
 *   - Property: 5-bedroom luxury home, Scottsdale AZ
 *   - Project: "Full Interior Repaint - Henderson 2026"
 *   - 12 rooms with realistic SW color choices + product lines
 *   - 18 photos (stub paths, representative annotations)
 *   - 42 annotations across walls, trim, ceilings, doors, accent walls
 *
 * Usage: npx tsx --require dotenv/config scripts/seed-demo-project.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- Helper: get or create color (links to whatever's in the DB) ---
async function getColorByCode(code: string) {
  const color = await prisma.color.findFirst({
    where: { colorCode: code, manufacturer: 'Sherwin Williams' },
  });
  if (!color) {
    throw new Error(
      `Color ${code} not found. Run: npx tsx scripts/seed-colors.ts first.`
    );
  }
  return color;
}

async function main() {
  console.log('🎨 Seeding rich demo project for synopsis generation...\n');

  // --- 1. User ---
  const email = 'demo@colorguru.com';
  const password = 'DemoPassword123!';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const hashed = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: 'Sarah Mitchell',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        companyName: 'Mitchell Color Design',
        role: 'consultant',
        tier: 'pro',
      },
    });
    console.log(`✅ Created consultant user: ${email} / ${password}`);
  } else {
    console.log(`ℹ️  Consultant user already exists: ${email}`);
  }

  // --- 2. Client ---
  let client = await prisma.client.findFirst({
    where: { userId: user.id, name: 'Michael & Diane Henderson' },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: user.id,
        name: 'Michael & Diane Henderson',
        contactName: 'Michael Henderson',
        email: 'michael.henderson@example.com',
        phone: '(480) 555-0142',
        type: 'individual',
        notes: 'Referred by design firm. Prefers warm neutrals. Timeline: 8 weeks.',
      },
    });
    console.log(`✅ Created client: Henderson Residence`);
  } else {
    console.log(`ℹ️  Client already exists: Henderson Residence`);
  }

  // --- 3. Property ---
  let property = await prisma.property.findFirst({
    where: { clientId: client.id, address: '8420 E Mountain View Dr' },
  });
  if (!property) {
    property = await prisma.property.create({
      data: {
        clientId: client.id,
        name: 'Henderson Primary Residence',
        address: '8420 E Mountain View Dr',
        city: 'Scottsdale',
        state: 'AZ',
        zipCode: '85253',
        type: 'residential',
        notes: '5 bed / 4.5 bath, 6,200 sq ft. Built 2015. Extensive natural light. Vaulted ceilings in living areas.',
      },
    });
    console.log(`✅ Created property: 8420 E Mountain View Dr, Scottsdale AZ`);
  } else {
    console.log(`ℹ️  Property already exists`);
  }

  // --- 4. Project ---
  let project = await prisma.project.findFirst({
    where: { userId: user.id, name: 'Full Interior Repaint - Henderson 2026' },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId: user.id,
        propertyId: property.id,
        name: 'Full Interior Repaint - Henderson 2026',
        description:
          'Complete interior color refresh. Focus on warm neutrals with sophisticated accent walls. Client wants cohesive flow between spaces.',
        status: 'active',
        // Keep legacy fields populated for backward compat
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        address: `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
      },
    });
    console.log(`✅ Created project: ${project.name}`);
  } else {
    console.log(`ℹ️  Project already exists. Clearing its data for reseed...`);
    // Clear annotations, photos, rooms to reseed clean
    await prisma.annotation.deleteMany({ where: { photo: { projectId: project.id } } });
    await prisma.photo.deleteMany({ where: { projectId: project.id } });
    await prisma.synopsisEntry.deleteMany({ where: { synopsis: { projectId: project.id } } });
    await prisma.colorSynopsis.deleteMany({ where: { projectId: project.id } });
    // Unlink project-scoped rooms (rooms are global now; just unlink)
    await prisma.room.updateMany({ where: { projectId: project.id }, data: { projectId: null } });
    console.log(`  Cleared prior annotations, photos, synopsis for clean reseed`);
  }

  // --- 5. Rooms (global, but attached to this project) ---
  const roomDefs = [
    { name: 'Entry Foyer', roomType: 'entry', subType: 'foyer' },
    { name: 'Great Room', roomType: 'living', subType: 'great_room' },
    { name: 'Dining Room', roomType: 'dining', subType: 'formal_dining' },
    { name: 'Gourmet Kitchen', roomType: 'kitchen', subType: 'gourmet' },
    { name: 'Breakfast Nook', roomType: 'kitchen', subType: 'breakfast' },
    { name: 'Primary Bedroom', roomType: 'bedroom', subType: 'primary' },
    { name: 'Primary Bathroom', roomType: 'bathroom', subType: 'primary_ensuite' },
    { name: 'Guest Bedroom 1', roomType: 'bedroom', subType: 'guest' },
    { name: 'Guest Bedroom 2', roomType: 'bedroom', subType: 'guest' },
    { name: 'Home Office', roomType: 'office', subType: 'home_office' },
    { name: 'Powder Room', roomType: 'bathroom', subType: 'powder' },
    { name: 'Upstairs Hallway', roomType: 'circulation', subType: 'hallway' },
  ];

  const rooms: Record<string, { id: string }> = {};
  for (const rd of roomDefs) {
    // Rooms are globally unique by name; upsert and attach to this project
    const room = await prisma.room.upsert({
      where: { name: rd.name },
      update: { projectId: project.id, roomType: rd.roomType, subType: rd.subType },
      create: {
        name: rd.name,
        projectId: project.id,
        roomType: rd.roomType,
        subType: rd.subType,
      },
    });
    rooms[rd.name] = room;
  }
  console.log(`✅ Created/linked ${roomDefs.length} rooms`);

  // --- 6. Load color references ---
  const colors = {
    alabaster: await getColorByCode('SW 7008'),
    accessibleBeige: await getColorByCode('SW 7036').catch(() => null),
    agreeableGray: await getColorByCode('SW 7029').catch(() => null),
    pureWhite: await getColorByCode('SW 7005').catch(() => null),
    extraWhite: await getColorByCode('SW 7006').catch(() => null),
    dorianGray: await getColorByCode('SW 7017').catch(() => null),
    greekVilla: await getColorByCode('SW 7551'),
    modernGray: await getColorByCode('SW 7632'),
    eiderWhite: await getColorByCode('SW 7014'),
    pewterCast: await getColorByCode('SW 7673'),
    upward: await getColorByCode('SW 9140'),
    crushedIce: await getColorByCode('SW 7599'),
    dorianGray2: await getColorByCode('SW 7072'),
    doverWhite: await getColorByCode('SW 6385'),
    rockCandy: await getColorByCode('SW 6245'),
  };

  // Build a safe palette pulling only colors that exist
  const palette = Object.entries(colors)
    .filter(([, c]) => c !== null)
    .reduce<Record<string, any>>((acc, [k, c]) => {
      acc[k] = c;
      return acc;
    }, {});

  const pick = (key: string) => palette[key] || palette.alabaster;
  console.log(`✅ Palette loaded: ${Object.keys(palette).length} colors`);

  // --- 7. Photos + Annotations ---
  // Each photo is one real room shot; each has 2-4 annotations by surface.

  type AnnSpec = {
    surfaceType: 'wall' | 'trim' | 'ceiling' | 'door' | 'accent_wall' | 'window' | 'cabinets';
    colorKey: keyof typeof colors;
    productLine: string;
    sheen: string;
    notes?: string;
  };

  type PhotoSpec = {
    roomName: string;
    filename: string;
    description: string;
    annotations: AnnSpec[];
  };

  const photoSpecs: PhotoSpec[] = [
    // Entry Foyer
    {
      roomName: 'Entry Foyer',
      filename: 'foyer-main.jpg',
      description: 'Main entry looking toward great room',
      annotations: [
        { surfaceType: 'wall', colorKey: 'greekVilla', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Base wall color throughout entry' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss', notes: 'All baseboards and door casings' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat', notes: '10ft ceiling' },
      ],
    },
    // Great Room - multiple photos
    {
      roomName: 'Great Room',
      filename: 'great-room-fireplace.jpg',
      description: 'Fireplace wall with vaulted ceiling',
      annotations: [
        { surfaceType: 'accent_wall', colorKey: 'dorianGray', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Fireplace accent wall — specified by client' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat', notes: 'Vaulted - tall ladder required' },
      ],
    },
    {
      roomName: 'Great Room',
      filename: 'great-room-windows.jpg',
      description: 'Window wall looking west',
      annotations: [
        { surfaceType: 'wall', colorKey: 'greekVilla', productLine: 'Emerald Interior', sheen: 'Matte' },
        { surfaceType: 'window', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss', notes: 'All window trim and sills' },
      ],
    },
    // Dining Room
    {
      roomName: 'Dining Room',
      filename: 'dining-main.jpg',
      description: 'Dining room toward bay window',
      annotations: [
        { surfaceType: 'wall', colorKey: 'accessibleBeige', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Warmer than great room - sets dining mood' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat' },
      ],
    },
    // Kitchen
    {
      roomName: 'Gourmet Kitchen',
      filename: 'kitchen-island.jpg',
      description: 'Island view with cabinets behind',
      annotations: [
        { surfaceType: 'wall', colorKey: 'greekVilla', productLine: 'Emerald Interior', sheen: 'Eggshell', notes: 'Eggshell for wipeability' },
        { surfaceType: 'cabinets', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Perimeter cabinets — spray finish' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Semi-Gloss' },
      ],
    },
    {
      roomName: 'Gourmet Kitchen',
      filename: 'kitchen-accent.jpg',
      description: 'Island accent cabinetry',
      annotations: [
        { surfaceType: 'cabinets', colorKey: 'dorianGray2', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Island only — contrast from perimeter' },
      ],
    },
    // Breakfast Nook
    {
      roomName: 'Breakfast Nook',
      filename: 'breakfast-nook.jpg',
      description: 'Banquette seating area',
      annotations: [
        { surfaceType: 'wall', colorKey: 'greekVilla', productLine: 'Emerald Interior', sheen: 'Eggshell' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
      ],
    },
    // Primary Bedroom
    {
      roomName: 'Primary Bedroom',
      filename: 'primary-bed-main.jpg',
      description: 'Bed wall and seating area',
      annotations: [
        { surfaceType: 'wall', colorKey: 'modernGray', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Calming tone — client preference' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat' },
      ],
    },
    {
      roomName: 'Primary Bedroom',
      filename: 'primary-bed-accent.jpg',
      description: 'Behind-bed accent wall',
      annotations: [
        { surfaceType: 'accent_wall', colorKey: 'upward', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Soft blue accent behind bed' },
      ],
    },
    // Primary Bathroom — note: trim is an EXCEPTION to universal Pure White (Eider White for moisture resistance)
    {
      roomName: 'Primary Bathroom',
      filename: 'primary-bath-vanity.jpg',
      description: 'Double vanity wall',
      annotations: [
        { surfaceType: 'wall', colorKey: 'eiderWhite', productLine: 'Duration Interior', sheen: 'Satin', notes: 'Moisture-resistant finish' },
        { surfaceType: 'trim', colorKey: 'eiderWhite', productLine: 'Emerald Urethane Trim', sheen: 'Semi-Gloss', notes: 'EXCEPTION: tone-on-tone with walls for serenity; also moisture-resistant' },
        { surfaceType: 'cabinets', colorKey: 'dorianGray', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Vanity cabinets — contrast to walls' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat' },
      ],
    },
    {
      roomName: 'Primary Bathroom',
      filename: 'primary-bath-shower.jpg',
      description: 'Shower enclosure wall and trim',
      annotations: [
        { surfaceType: 'wall', colorKey: 'eiderWhite', productLine: 'Duration Interior', sheen: 'Satin' },
        { surfaceType: 'trim', colorKey: 'eiderWhite', productLine: 'Emerald Urethane Trim', sheen: 'Semi-Gloss' },
      ],
    },
    // Guest Bedroom 1
    {
      roomName: 'Guest Bedroom 1',
      filename: 'guest1-main.jpg',
      description: 'Guest bedroom overall',
      annotations: [
        { surfaceType: 'wall', colorKey: 'agreeableGray', productLine: 'SuperPaint', sheen: 'Eggshell' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Semi-Gloss' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat' },
      ],
    },
    // Guest Bedroom 2
    {
      roomName: 'Guest Bedroom 2',
      filename: 'guest2-main.jpg',
      description: 'Second guest bedroom',
      annotations: [
        { surfaceType: 'wall', colorKey: 'crushedIce', productLine: 'SuperPaint', sheen: 'Eggshell', notes: 'Lighter than Guest 1 for variety' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Semi-Gloss' },
      ],
    },
    // Home Office
    {
      roomName: 'Home Office',
      filename: 'office-main.jpg',
      description: 'Built-in bookshelf wall',
      annotations: [
        { surfaceType: 'wall', colorKey: 'pewterCast', productLine: 'Emerald Interior', sheen: 'Matte', notes: 'Deeper tone for focused work environment' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
        { surfaceType: 'cabinets', colorKey: 'pewterCast', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Built-ins match wall — monochrome treatment' },
      ],
    },
    // Powder Room — note: ceiling is an EXCEPTION to universal Alabaster (Dover White for warmer drama)
    {
      roomName: 'Powder Room',
      filename: 'powder-room.jpg',
      description: 'Statement powder room',
      annotations: [
        { surfaceType: 'wall', colorKey: 'pewterCast', productLine: 'Emerald Interior', sheen: 'Satin', notes: 'Jewel-box treatment — dramatic for guests' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Semi-Gloss' },
        { surfaceType: 'ceiling', colorKey: 'doverWhite', productLine: 'ProMar 200', sheen: 'Flat', notes: 'EXCEPTION: warmer tone for intimate powder room — client preference' },
      ],
    },
    {
      roomName: 'Powder Room',
      filename: 'powder-room-mirror.jpg',
      description: 'Mirror wall with vanity below',
      annotations: [
        { surfaceType: 'wall', colorKey: 'pewterCast', productLine: 'Emerald Interior', sheen: 'Satin' },
        { surfaceType: 'cabinets', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Contrast against jewel-box walls' },
      ],
    },
    // Upstairs Hallway
    {
      roomName: 'Upstairs Hallway',
      filename: 'upstairs-hall.jpg',
      description: 'Hallway looking toward bedrooms',
      annotations: [
        { surfaceType: 'wall', colorKey: 'greekVilla', productLine: 'SuperPaint', sheen: 'Eggshell', notes: 'Matches main level for continuity' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Semi-Gloss' },
        { surfaceType: 'door', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Semi-Gloss', notes: '5 doors on this hall' },
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat' },
      ],
    },
    // Additional coverage photos
    {
      roomName: 'Dining Room',
      filename: 'dining-ceiling.jpg',
      description: 'Tray ceiling detail',
      annotations: [
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat', notes: 'Tray ceiling — confirm crown molding color match' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'Emerald Interior', sheen: 'Semi-Gloss' },
      ],
    },
    {
      roomName: 'Great Room',
      filename: 'great-room-beams.jpg',
      description: 'Vaulted ceiling with exposed beams',
      annotations: [
        { surfaceType: 'ceiling', colorKey: 'alabaster', productLine: 'ProMar 200', sheen: 'Flat', notes: 'Between beams only — beams stained, not painted' },
      ],
    },
    {
      roomName: 'Primary Bedroom',
      filename: 'primary-closet.jpg',
      description: 'Walk-in closet interior',
      annotations: [
        { surfaceType: 'wall', colorKey: 'modernGray', productLine: 'SuperPaint', sheen: 'Eggshell', notes: 'Matches bedroom for continuity' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Semi-Gloss' },
        { surfaceType: 'cabinets', colorKey: 'pureWhite', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Built-in closet system' },
      ],
    },
    {
      roomName: 'Home Office',
      filename: 'office-shelves.jpg',
      description: 'Built-in bookshelf detail',
      annotations: [
        { surfaceType: 'cabinets', colorKey: 'pewterCast', productLine: 'Emerald Urethane Trim', sheen: 'Satin', notes: 'Interior of shelves same as exterior — monochrome' },
      ],
    },
    {
      roomName: 'Gourmet Kitchen',
      filename: 'kitchen-pantry.jpg',
      description: 'Walk-in pantry',
      annotations: [
        { surfaceType: 'wall', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Eggshell', notes: 'Bright finish for pantry visibility' },
        { surfaceType: 'trim', colorKey: 'pureWhite', productLine: 'SuperPaint', sheen: 'Semi-Gloss' },
      ],
    },
  ];

  let photoCount = 0;
  let annotationCount = 0;

  for (const spec of photoSpecs) {
    const room = rooms[spec.roomName];
    if (!room) {
      console.warn(`⚠️  Room not found: ${spec.roomName}, skipping photo ${spec.filename}`);
      continue;
    }

    const photo = await prisma.photo.create({
      data: {
        projectId: project.id,
        roomId: room.id,
        filename: spec.filename,
        originalFilename: spec.filename,
        cloud_storage_path: `demo/${project.id}/${spec.filename}`, // stub path
        medium_path: `demo/${project.id}/medium-${spec.filename}`,
        thumbnail_path: `demo/${project.id}/thumb-${spec.filename}`,
        mimeType: 'image/jpeg',
        size: 2_400_000,
        width: 2048,
        height: 1536,
        description: spec.description,
      },
    });
    photoCount++;

    for (const ann of spec.annotations) {
      const color = pick(ann.colorKey);
      await prisma.annotation.create({
        data: {
          photoId: photo.id,
          roomId: room.id,
          colorId: color.id,
          type: 'color_tag',
          surfaceType: ann.surfaceType,
          productLine: ann.productLine,
          sheen: ann.sheen,
          notes: ann.notes,
          data: {
            coordinates: {
              x: Math.floor(Math.random() * 1800 + 100),
              y: Math.floor(Math.random() * 1300 + 100),
            },
          },
        },
      });
      annotationCount++;
    }
  }

  console.log(`✅ Created ${photoCount} photos`);
  console.log(`✅ Created ${annotationCount} annotations`);

  // --- 8. Summary ---
  console.log('\n📊 Project Summary:');
  console.log(`   Consultant: ${user.name} (${user.email})`);
  console.log(`   Client: ${client.name}`);
  console.log(`   Property: ${property.address}, ${property.city}`);
  console.log(`   Project: ${project.name}`);
  console.log(`   Project ID: ${project.id}`);
  console.log(`   Rooms: ${roomDefs.length}`);
  console.log(`   Photos: ${photoCount}`);
  console.log(`   Annotations: ${annotationCount}`);
  console.log('\n🎯 Next step: Generate synopsis via UI or:');
  console.log(`   curl -X POST http://localhost:3000/api/projects/${project.id}/synopsis/generate`);
  console.log(`\n🔐 Login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
