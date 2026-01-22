import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/colors/favorite
 * Toggle favorite status for a color
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { colorId } = await request.json()

    if (!colorId) {
      return NextResponse.json({ error: 'Color ID required' }, { status: 400 })
    }

    // Check if already favorited
    const existing = await prisma.userFavoriteColor.findUnique({
      where: {
        userId_colorId: {
          userId: session.user.id,
          colorId
        }
      }
    })

    if (existing) {
      // Remove from favorites
      await prisma.userFavoriteColor.delete({
        where: {
          userId_colorId: {
            userId: session.user.id,
            colorId
          }
        }
      })
      return NextResponse.json({ favorited: false, message: 'Removed from favorites' })
    } else {
      // Add to favorites
      await prisma.userFavoriteColor.create({
        data: {
          userId: session.user.id,
          colorId
        }
      })
      return NextResponse.json({ favorited: true, message: 'Added to favorites' })
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/colors/favorite
 * Get all favorite colors for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const favorites = await prisma.userFavoriteColor.findMany({
      where: { userId: session.user.id },
      include: {
        color: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Return just the colors
    const favoriteColors = favorites.map(f => f.color)

    return NextResponse.json(favoriteColors)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}
