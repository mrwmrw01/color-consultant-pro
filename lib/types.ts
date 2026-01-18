
export interface Client {
  id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  type?: string
  notes?: string
  status: string
  createdAt: Date
  updatedAt: Date
  userId: string
  properties?: Property[]
  _count?: {
    properties: number
  }
}

export interface Property {
  id: string
  name?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  type?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  status: string
  createdAt: Date
  updatedAt: Date
  clientId: string
  client?: Client
  projects?: Project[]
  _count?: {
    projects: number
  }
}

export interface Project {
  id: string
  name: string
  description?: string
  
  // NEW: 3-tier hierarchy
  propertyId?: string
  property?: Property
  
  // OLD: Direct client fields (deprecated)
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  address?: string
  
  status: string
  createdAt: Date
  updatedAt: Date
  userId: string
  photos?: Photo[]
  rooms?: Room[]
  synopsis?: ColorSynopsis[]
}

export interface Room {
  id: string
  name: string
  description?: string
  roomType?: string
  subType?: string
  projectId: string
  createdAt: Date
  updatedAt: Date
  photos?: Photo[]
  annotations?: Annotation[]
}

export interface Photo {
  id: string
  filename: string
  originalFilename: string
  cloud_storage_path: string
  mimeType: string
  size: number
  width?: number
  height?: number
  projectId: string
  roomId?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  annotations?: Annotation[]
}

export interface Annotation {
  id: string
  photoId: string
  roomId?: string
  type: string
  data: any
  surfaceType?: string
  colorId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  color?: Color
}

export interface Color {
  id: string
  name: string
  manufacturer: string
  productLine: string
  sheen: string
  hexColor?: string
  notes?: string
  usageCount: number
  firstUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ColorSynopsis {
  id: string
  projectId: string
  title: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  entries?: SynopsisEntry[]
}

export interface SynopsisEntry {
  id: string
  synopsisId: string
  roomId: string
  colorId: string
  surfaceType: string
  surfaceArea?: string
  quantity?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  room?: Room
  color?: Color
}

export interface AnnotationData {
  type: 'drawing' | 'text' | 'color_tag'
  coordinates?: { x: number; y: number }[]
  text?: string
  color?: string
  strokeWidth?: number
  bounds?: { x: number; y: number; width: number; height: number }
}

export interface DrawingTool {
  type: 'pen' | 'marker' | 'text' | 'colorTag'
  color: string
  strokeWidth: number
  opacity: number
}

export const SURFACE_TYPES = [
  'Wall',
  'Ceiling',
  'Trim',
  'Door',
  'Window',
  'Cabinet',
  'Molding',
  'Baseboard',
  'Crown Molding',
  'Wainscoting',
  'Accent Wall',
  'Fireplace',
  'Built-in',
  'Other'
] as const

export type SurfaceType = typeof SURFACE_TYPES[number]

export const ROOM_HIERARCHY = {
  'Custom': {
    label: 'Custom Room Name',
    subtypes: ['Enter Custom Name']
  },
  'Bedroom': {
    label: 'Bedroom',
    subtypes: ['Primary', 'Guest', 'Kids', 'Other']
  },
  'Bathroom': {
    label: 'Bathroom',
    subtypes: ['Master', 'Guest', 'Hall', 'Powder', 'Jack & Jill', 'Custom']
  },
  'Living Areas': {
    label: 'Living Areas',
    subtypes: ['Living Room', 'Family Room', 'Den', 'Great Room', 'Other']
  },
  'Kitchen': {
    label: 'Kitchen',
    subtypes: ['Main Kitchen', 'Butler\'s Pantry', 'Breakfast Nook', 'Other']
  },
  'Dining': {
    label: 'Dining',
    subtypes: ['Formal Dining', 'Casual Dining', 'Breakfast Room', 'Other']
  },
  'Office/Study': {
    label: 'Office/Study',
    subtypes: ['Home Office', 'Study', 'Library', 'Craft Room', 'Other']
  },
  'Utility Areas': {
    label: 'Utility Areas',
    subtypes: ['Laundry Room', 'Mudroom', 'Pantry', 'Storage', 'Other']
  },
  'Entryway': {
    label: 'Entryway',
    subtypes: ['Foyer', 'Front Entry', 'Back Entry', 'Vestibule', 'Other']
  },
  'Hallway': {
    label: 'Hallway',
    subtypes: ['Main Hall', 'Upstairs Hall', 'Basement Hall', 'Other']
  },
  'Basement': {
    label: 'Basement',
    subtypes: ['Finished', 'Unfinished', 'Recreation Room', 'Other']
  },
  'Attic': {
    label: 'Attic',
    subtypes: ['Finished', 'Unfinished', 'Storage', 'Other']
  },
  'Garage': {
    label: 'Garage',
    subtypes: ['One Car', 'Two Car', 'Three Car', 'Workshop', 'Other']
  },
  'Exterior': {
    label: 'Exterior',
    subtypes: ['Front', 'Back', 'Side', 'Porch', 'Deck', 'Other']
  },
  'Other': {
    label: 'Other',
    subtypes: ['Custom Defined']
  }
} as const

export type RoomType = keyof typeof ROOM_HIERARCHY
export type RoomSubType<T extends RoomType> = typeof ROOM_HIERARCHY[T]['subtypes'][number]

// Product Lines - can be selected independently for any color
export const PRODUCT_LINES = [
  'Cashmere Interior',
  'Duration Interior', 
  'Emerald Interior',
  'SuperPaint Interior',
  'ProClassic Interior',
  'Harmony Interior',
  'ProMar 200 Interior',
  'A-100 Interior',
  'Cashmere Exterior',
  'Duration Exterior',
  'Emerald Exterior',
  'SuperPaint Exterior',
  'A-100 Exterior',
  'Custom'
] as const

// Sheens - can be selected independently for any color
export const SHEEN_OPTIONS = [
  'Flat',
  'Matte',
  'Eggshell',
  'Satin',
  'Pearl',
  'Semi-Gloss',
  'Gloss',
  'High-Gloss'
] as const

export type ProductLine = typeof PRODUCT_LINES[number]
export type SheenOption = typeof SHEEN_OPTIONS[number]
