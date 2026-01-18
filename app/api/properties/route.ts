
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/properties?clientId=xxx - List properties for a client
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId parameter is required' },
        { status: 400 }
      );
    }

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const properties = await prisma.property.findMany({
      where: {
        clientId: clientId
      },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: {
        address: 'asc'
      }
    });

    return NextResponse.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      name,
      address,
      city,
      state,
      zipCode,
      type,
      contactName,
      contactEmail,
      contactPhone,
      notes,
      status
    } = body;

    // Validate required fields
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!address || address.trim() === '') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check for duplicate address
    const existingProperty = await prisma.property.findFirst({
      where: {
        clientId: clientId,
        address: address.trim()
      }
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: 'A property with this address already exists for this client' },
        { status: 400 }
      );
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        clientId: clientId,
        name: name?.trim() || null,
        address: address.trim(),
        city: city?.trim() || null,
        state: state?.trim() || null,
        zipCode: zipCode?.trim() || null,
        type: type || 'residential',
        contactName: contactName?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'active'
      },
      include: {
        client: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    );
  }
}
