import { NextResponse } from 'next/server';
import { CLAUSE_IDS } from '@/lib/clauseList';

export async function GET() {
  try {
    return NextResponse.json({ clauseIds: CLAUSE_IDS });
  } catch (error) {
    console.error('Error loading clauses:', error);
    return NextResponse.json({ error: 'Failed to load clauses' }, { status: 500 });
  }
} 