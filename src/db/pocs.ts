import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { userPocProjects, users } from './schema.ts';
import { getOrCreateUser } from './users.ts';

export interface PocProjectInput {
  id: string;
  title: string;
  domain: string;
  linkedPaperTitle?: string;
  linkedPaperUrl?: string;
  hypothesis: string;
  parameters?: string;
  auditReport?: string;
}

export async function getPocsForUser(uid: string) {
  try {
    const rows = await db
      .select({
        id: userPocProjects.pocId,
        title: userPocProjects.title,
        domain: userPocProjects.domain,
        linkedPaperTitle: userPocProjects.linkedPaperTitle,
        linkedPaperUrl: userPocProjects.linkedPaperUrl,
        hypothesis: userPocProjects.hypothesis,
        parameters: userPocProjects.parameters,
        auditReport: userPocProjects.auditReport,
        isPublic: userPocProjects.isPublic,
        updatedAt: userPocProjects.updatedAt,
      })
      .from(userPocProjects)
      .innerJoin(users, eq(userPocProjects.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(userPocProjects.updatedAt));

    return rows;
  } catch (error) {
    console.error('Failed to load private PoCs:', error);
    throw new Error('Failed to load private PoC blueprints.', { cause: error });
  }
}

export async function savePocForUser(uid: string, email: string, poc: PocProjectInput) {
  try {
    const user = await getOrCreateUser(uid, email);

    await db
      .insert(userPocProjects)
      .values({
        userId: user.id,
        pocId: poc.id,
        title: poc.title,
        domain: poc.domain,
        linkedPaperTitle: poc.linkedPaperTitle || '',
        linkedPaperUrl: poc.linkedPaperUrl || '',
        hypothesis: poc.hypothesis,
        parameters: poc.parameters || '',
        auditReport: poc.auditReport || '',
        isPublic: false,
      })
      .onConflictDoUpdate({
        target: [userPocProjects.userId, userPocProjects.pocId],
        set: {
          title: poc.title,
          domain: poc.domain,
          linkedPaperTitle: poc.linkedPaperTitle || '',
          linkedPaperUrl: poc.linkedPaperUrl || '',
          hypothesis: poc.hypothesis,
          parameters: poc.parameters || '',
          auditReport: poc.auditReport || '',
          updatedAt: new Date(),
        },
      });

    return { success: true };
  } catch (error) {
    console.error('Failed to save private PoC:', error);
    throw new Error('Failed to save private PoC blueprint.', { cause: error });
  }
}

export async function setPocPublicStatusForUser(uid: string, pocId: string, isPublic: boolean) {
  try {
    const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (existingUsers.length === 0) {
      return { found: false, isPublic: false };
    }

    const updated = await db
      .update(userPocProjects)
      .set({
        isPublic,
        updatedAt: new Date(),
      })
      .where(and(eq(userPocProjects.userId, existingUsers[0].id), eq(userPocProjects.pocId, pocId)))
      .returning({ id: userPocProjects.id, isPublic: userPocProjects.isPublic });

    if (updated.length === 0) {
      return { found: false, isPublic: false };
    }

    return { found: true, isPublic: updated[0].isPublic };
  } catch (error) {
    console.error('Failed to update PoC visibility:', error);
    throw new Error('Failed to update blueprint visibility.', { cause: error });
  }
}

export async function deletePocForUser(uid: string, pocId: string) {
  try {
    const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.uid, uid)).limit(1);
    if (existingUsers.length === 0) {
      return { success: true };
    }

    await db
      .delete(userPocProjects)
      .where(and(eq(userPocProjects.userId, existingUsers[0].id), eq(userPocProjects.pocId, pocId)));

    return { success: true };
  } catch (error) {
    console.error('Failed to delete private PoC:', error);
    throw new Error('Failed to delete blueprint.', { cause: error });
  }
}

export async function getPublicShowcasePocs(limit = 30) {
  try {
    const rows = await db
      .select({
        id: userPocProjects.pocId,
        title: userPocProjects.title,
        domain: userPocProjects.domain,
        linkedPaperTitle: userPocProjects.linkedPaperTitle,
        linkedPaperUrl: userPocProjects.linkedPaperUrl,
        hypothesis: userPocProjects.hypothesis,
        parameters: userPocProjects.parameters,
        auditReport: userPocProjects.auditReport,
        updatedAt: userPocProjects.updatedAt,
      })
      .from(userPocProjects)
      .where(eq(userPocProjects.isPublic, true))
      .orderBy(desc(userPocProjects.updatedAt))
      .limit(limit);

    return rows;
  } catch (error) {
    console.error('Failed to load public PoC showcase:', error);
    throw new Error('Failed to load public showcase.', { cause: error });
  }
}
