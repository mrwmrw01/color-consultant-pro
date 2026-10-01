import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as ExcelJS from 'exceljs';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    // Only allow https (and http for localhost dev)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    // Block private/internal IPs and metadata endpoints
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function getWorkbookBuffer(formData: FormData): Promise<Buffer> {
  const file = formData.get('file') as File | null;
  const url = formData.get('url') as string | null;

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (url && url.trim() !== '') {
    const trimmedUrl = url.trim();
    if (!isUrlSafe(trimmedUrl)) {
      throw new Error('Invalid or disallowed URL. Use a public https link.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(trimmedUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.status} ${response.statusText}`);
      }
      // Check Content-Length before downloading to prevent OOM
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
        throw new Error(`Remote file exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('No file or URL provided');
}

async function parseWorkbook(buffer: Buffer): Promise<{ headers: string[]; rows: any[][]; totalRows: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheets found in the file');
  }

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  const rows: any[][] = [];
  let totalRows = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    totalRows++;
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;
      if (value === null || value === undefined) {
        rowData[colNumber - 1] = '';
      } else if (typeof value === 'object' && 'text' in value) {
        // Rich text or hyperlink
        rowData[colNumber - 1] = String(value.text ?? '').trim();
      } else if (typeof value === 'object' && 'result' in value) {
        // Formula
        rowData[colNumber - 1] = String(value.result ?? '').trim();
      } else {
        rowData[colNumber - 1] = String(value).trim();
      }
    });
    rows.push(rowData);
  });

  return { headers, rows, totalRows };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const action = formData.get('action') as string;

    if (!action || (action !== 'preview' && action !== 'import')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "preview" or "import".' },
        { status: 400 }
      );
    }

    // Get the file buffer from either file upload or URL
    let buffer: Buffer;
    try {
      buffer = await getWorkbookBuffer(formData);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'Failed to read file' },
        { status: 400 }
      );
    }

    // Enforce max file size
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    // Validate XLSX magic bytes (PK zip header: 50 4B 03 04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a valid .xlsx file.' },
        { status: 400 }
      );
    }

    // Parse the workbook
    let parsed: { headers: string[]; rows: any[][]; totalRows: number };
    try {
      parsed = await parseWorkbook(buffer);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'Failed to parse XLSX file' },
        { status: 400 }
      );
    }

    // ── PREVIEW ACTION ──────────────────────────────────────────────
    if (action === 'preview') {
      const preview = parsed.rows.slice(0, 5);
      return NextResponse.json({
        headers: parsed.headers,
        preview,
        totalRows: parsed.totalRows,
      });
    }

    // ── IMPORT ACTION ───────────────────────────────────────────────
    const mappingRaw = formData.get('mapping') as string | null;
    if (!mappingRaw) {
      return NextResponse.json(
        { error: 'Column mapping is required for import' },
        { status: 400 }
      );
    }

    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json(
        { error: 'Invalid mapping JSON' },
        { status: 400 }
      );
    }

    if (!mapping.name) {
      return NextResponse.json(
        { error: 'Name column mapping is required' },
        { status: 400 }
      );
    }

    // Build a header-to-index lookup
    const headerIndex: Record<string, number> = {};
    parsed.headers.forEach((h, i) => {
      headerIndex[h] = i;
    });

    // Resolve the column index for each mapped field
    const fieldIndices: Record<string, number | undefined> = {};
    const mappableFields = ['name', 'contactName', 'email', 'phone', 'type', 'notes'];
    for (const field of mappableFields) {
      const headerName = mapping[field];
      if (headerName && headerIndex[headerName] !== undefined) {
        fieldIndices[field] = headerIndex[headerName];
      }
    }

    if (fieldIndices.name === undefined) {
      return NextResponse.json(
        { error: `Mapped name column "${mapping.name}" not found in spreadsheet headers` },
        { status: 400 }
      );
    }

    const validTypes = new Set(['individual', 'business', 'property_management', 'contractor']);

    // Extract client data from rows
    const clientsToCreate: Array<{
      row: number;
      name: string;
      contactName: string | null;
      email: string | null;
      phone: string | null;
      type: string | null;
      notes: string | null;
    }> = [];

    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const rowData = parsed.rows[i];
      const rowNumber = i + 2; // 1-indexed, row 1 is header

      const getCellValue = (field: string): string => {
        const idx = fieldIndices[field];
        if (idx === undefined) return '';
        return String(rowData[idx] ?? '').trim();
      };

      const name = getCellValue('name');

      // Skip empty rows
      if (!name) {
        continue;
      }

      const typeValue = getCellValue('type');
      const resolvedType = typeValue && validTypes.has(typeValue.toLowerCase())
        ? typeValue.toLowerCase()
        : null;

      clientsToCreate.push({
        row: rowNumber,
        name,
        contactName: getCellValue('contactName') || null,
        email: getCellValue('email') || null,
        phone: getCellValue('phone') || null,
        type: resolvedType,
        notes: getCellValue('notes') || null,
      });
    }

    // Fetch all existing client names for this user in one query
    const existingClients = await prisma.client.findMany({
      where: { userId: session.user.id },
      select: { name: true },
    });
    const existingNames = new Set(existingClients.map((c) => c.name));

    // Separate new clients from duplicates
    const newClients: typeof clientsToCreate = [];
    const batchNames = new Set<string>();
    let skipped = 0;

    for (const client of clientsToCreate) {
      if (existingNames.has(client.name)) {
        skipped++;
        errors.push({ row: client.row, reason: `Duplicate: client "${client.name}" already exists` });
      } else if (batchNames.has(client.name)) {
        skipped++;
        errors.push({ row: client.row, reason: `Duplicate within import: "${client.name}"` });
      } else {
        batchNames.add(client.name);
        newClients.push(client);
      }
    }

    // Create all non-duplicate clients in bulk
    let created = 0;
    if (newClients.length > 0) {
      const result = await prisma.client.createMany({
        data: newClients.map((c) => ({
          userId: session.user!.id,
          name: c.name,
          contactName: c.contactName,
          email: c.email,
          phone: c.phone,
          type: c.type || 'individual',
          notes: c.notes,
          status: 'active',
        })),
        skipDuplicates: true,
      });
      created = result.count;
    }

    return NextResponse.json({
      created,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Error in client import:', error);
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
