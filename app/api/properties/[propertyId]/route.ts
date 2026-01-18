
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/properties/[propertyId] - Get property details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await params

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        client: {
          userId: session.user.id
        }
      },
      include: {
        client: true,
        projects: {
          include: {
            _count: {
              select: {
                photos: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

// PUT /api/properties/[propertyId] - Update property
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await params
    const body = await req.json();
    const {
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

    // Verify property ownership
    const existingProperty = await prisma.property.findFirst({
      where: {
        id: propertyId,
        client: {
          userId: session.user.id
        }
      },
      include: {
        client: true
      }
    });

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check for address conflicts if address is being changed
    if (address && address !== existingProperty.address) {
      const addressConflict = await prisma.property.findFirst({
        where: {
          clientId: existingProperty.clientId,
          address: address.trim(),
          id: { not: propertyId }
        }
      });

      if (addressConflict) {
        return NextResponse.json(
          { error: 'A property with this address already exists for this client' },
          { status: 400 }
        );
      }
    }

    // Update property
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(address && { address: address.trim() }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(state !== undefined && { state: state?.trim() || null }),
        ...(zipCode !== undefined && { zipCode: zipCode?.trim() || null }),
        ...(type && { type }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status && { status })
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

    return NextResponse.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[propertyId] - Delete property
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await params

    // Verify property ownership and check for projects
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        client: {
          userId: session.user.id
        }
      },
      include: {
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property._count.projects > 0) {
      return NextResponse.json(
        { error: 'Cannot delete property with existing projects. Delete projects first.' },
        { status: 400 }
      );
    }

    // Delete property
    await prisma.property.delete({
      where: { id: propertyId }
    });

    return NextResponse.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}
