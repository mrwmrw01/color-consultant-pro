
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/clients/[clientId] - Get client details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id
      },
      include: {
        properties: {
          include: {
            projects: {
              include: {
                _count: {
                  select: {
                    photos: true
                  }
                }
              }
            },
            _count: {
              select: {
                projects: true
              }
            }
          },
          orderBy: {
            address: 'asc'
          }
        },
        _count: {
          select: {
            properties: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[clientId] - Update client
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params
    const body = await req.json();
    const { name, contactName, email, phone, type, notes, status } = body;

    // Verify client ownership
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id
      }
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check for name conflicts if name is being changed
    if (name && name !== existingClient.name) {
      const nameConflict = await prisma.client.findFirst({
        where: {
          userId: session.user.id,
          name: name.trim(),
          id: { not: clientId }
        }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A client with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Update client
    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(name && { name: name.trim() }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(type && { type }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status && { status })
      },
      include: {
        _count: {
          select: {
            properties: true
          }
        }
      }
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[clientId] - Delete client
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params

    // Verify client ownership and check for properties
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            properties: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client._count.properties > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with existing properties. Delete properties first.' },
        { status: 400 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { id: clientId }
    });

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
