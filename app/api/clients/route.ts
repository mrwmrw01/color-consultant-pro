
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clients - List all clients for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        properties: {
          include: {
            _count: {
              select: {
                projects: true
              }
            }
          }
        },
        _count: {
          select: {
            properties: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create a new client
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, contactName, email, phone, type, notes, status } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate client name
    const existingClient = await prisma.client.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim()
      }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'A client with this name already exists' },
        { status: 400 }
      );
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        contactName: contactName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        type: type || 'individual',
        notes: notes?.trim() || null,
        status: status || 'active'
      },
      include: {
        _count: {
          select: {
            properties: true
          }
        }
      }
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
