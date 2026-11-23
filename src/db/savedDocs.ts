import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { savedScienceDocs, users } from './schema.ts';
import { getOrCreateUser } from './users.ts';

export interface ScienceResourceInput {
  id: string;
  type: 'book' | 'paper';
  source: string;
  institution?: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  pdfUrl: string;
}

export async function getSavedDocsForUser(uid: string) {
  try {
    const rows = await db
      .select({
        id: savedScienceDocs.docId,
        type: savedScienceDocs.docType,
        source: savedScienceDocs.source,
        institution: savedScienceDocs.institution,
        title: savedScienceDocs.title,
        authors: savedScienceDocs.authors,
        year: savedScienceDocs.pubYear,
        abstract: savedScienceDocs.abstract,
        pdfUrl: savedScienceDocs.pdfUrl,
        savedAt: savedScienceDocs.savedAt,
      })
      .from(savedScienceDocs)
      .innerJoin(users, eq(savedScienceDocs.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(savedScienceDocs.savedAt));

    return rows;
  } catch (error) {
    console.error('Failed to fetch saved docs:', error);
    throw new Error('Failed to load synced reading list.', { cause: error });
  }
}

export async function saveDocForUser(uid: string, email: string, item: ScienceResourceInput) {
  try {
    const user = await getOrCreateUser(uid, email);

    await db
      .insert(savedScienceDocs)
      .values({
        userId: user.id,
        docId: item.id,
        docType: item.type,
        source: item.source,
        institution: item.institution || 'Global Repository',
        title: item.title,
        authors: item.authors,
        pubYear: String(item.year || 'N/A'),
        abstract: item.abstract,
        pdfUrl: item.pdfUrl,
      })
      .onConflictDoNothing({
        target: [savedScienceDocs.userId, savedScienceDocs.docId],
      });

    return { success: true };
  } catch (error) {
    console.error('Failed to save doc:', error);
    throw new Error('Failed to save bookmark to reading list.', { cause: error });
  }
}

export async function removeSavedDocForUser(uid: string, docId: string) {
  try {
    const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (existingUsers.length === 0) {
      return { success: true };
    }

    await db
      .delete(savedScienceDocs)
      .where(and(eq(savedScienceDocs.userId, existingUsers[0].id), eq(savedScienceDocs.docId, docId)));

    return { success: true };
  } catch (error) {
    console.error('Failed to remove saved doc:', error);
    throw new Error('Failed to remove bookmark from reading list.', { cause: error });
  }
}
