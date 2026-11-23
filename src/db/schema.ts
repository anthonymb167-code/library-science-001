import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedScienceDocs = pgTable(
  'saved_science_docs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    docId: text('doc_id').notNull(),
    docType: text('doc_type').notNull(),
    source: text('source').notNull(),
    institution: text('institution').notNull().default('Global Repository'),
    title: text('title').notNull(),
    authors: text('authors').notNull(),
    pubYear: text('pub_year').notNull(),
    abstract: text('abstract').notNull(),
    pdfUrl: text('pdf_url').notNull(),
    savedAt: timestamp('saved_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('saved_science_docs_user_doc_idx').on(table.userId, table.docId)],
);

export const userPocProjects = pgTable(
  'user_poc_projects',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    pocId: text('poc_id').notNull(),
    title: text('title').notNull(),
    domain: text('domain').notNull(),
    linkedPaperTitle: text('linked_paper_title').notNull().default(''),
    linkedPaperUrl: text('linked_paper_url').notNull().default(''),
    hypothesis: text('hypothesis').notNull(),
    parameters: text('parameters').notNull().default(''),
    auditReport: text('audit_report').notNull().default(''),
    isPublic: boolean('is_public').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_poc_projects_user_poc_idx').on(table.userId, table.pocId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  savedDocs: many(savedScienceDocs),
  pocProjects: many(userPocProjects),
}));

export const savedScienceDocsRelations = relations(savedScienceDocs, ({ one }) => ({
  user: one(users, {
    fields: [savedScienceDocs.userId],
    references: [users.id],
  }),
}));

export const userPocProjectsRelations = relations(userPocProjects, ({ one }) => ({
  user: one(users, {
    fields: [userPocProjects.userId],
    references: [users.id],
  }),
}));
