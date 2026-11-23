import { GoogleGenAI } from '@google/genai';
import express from 'express';
import {
  deletePocForUser,
  getPocsForUser,
  getPublicShowcasePocs,
  PocProjectInput,
  savePocForUser,
  setPocPublicStatusForUser,
} from '../db/pocs.ts';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';

const router = express.Router();

function buildDeterministicAudit(params: {
  title: string;
  domain: string;
  hypothesis: string;
  parameters?: string;
  linkedPaperTitle?: string;
}): string {
  const { title, domain, hypothesis, parameters, linkedPaperTitle } = params;
  return [
    `1. FIRST-PRINCIPLES VIABILITY (${domain})`,
    `• Concept: "${title}"`,
    `• Literature Grounding: ${linkedPaperTitle || 'Independent hypothesis (link an open-access textbook or paper for citation grounding).'}`,
    `• Mechanism Check: Evaluate conservation of mass, energy balance, stoichiometry, or clinical pharmacokinetics for: ${hypothesis}`,
    '',
    `2. PRIMARY BOTTLENECKS & BOUNDARY CONSTRAINTS`,
    `• Specified Parameters: ${parameters || 'Define operating temperature, pressure, concentration, voltage/power budget, or dosage bounds.'}`,
    `• Failure Modes: Check thermal dissipation limits, material degradation, bioavailability/toxicity thresholds, and control latency.`,
    '',
    `3. QUANTITATIVE VARIABLES TO MEASURE`,
    `• Efficiency ratio (output vs. energy/reagent input), steady-state stability margin, and error tolerance under worst-case load.`,
    '',
    `4. RECOMMENDED VIRTUAL SIMULATION NEXT STEP`,
    `• Build a quantitative Python/NumPy mass-energy or differential model (or circuit simulation in Wokwi/SPICE) to verify bounds before physical lab or hardware prototyping.`,
  ].join('\n');
}

router.post('/poc/audit', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const domain = String(req.body?.domain || 'General Science').trim();
  const hypothesis = String(req.body?.hypothesis || '').trim();
  const parameters = String(req.body?.parameters || '').trim();
  const linkedPaperTitle = String(req.body?.linkedPaperTitle || '').trim();
  const forceOfflineChecklist = Boolean(req.body?.offlineFallback);

  if (!title || !hypothesis) {
    return res.status(400).json({ error: 'Project title and core mechanism/hypothesis are required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const hasConfiguredKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');

  if (hasConfiguredKey && !forceOfflineChecklist) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        `Act as a rigorous tertiary R&D scientific feasibility reviewer in ${domain}.`,
        `Project Title: ${title}`,
        `Literature Grounding: ${linkedPaperTitle || 'Independent Hypothesis'}`,
        `Mechanism & Hypothesis: ${hypothesis}`,
        `Constraints & Parameters: ${parameters || 'Not specified'}`,
        '',
        'Provide a concise, structured Proof-of-Concept Feasibility Dossier using plain numbered headings (no markdown asterisks) covering:',
        '1. First-Principles Viability (Thermodynamics, Biology, Chemistry, Clinical Safety, or Physics check)',
        '2. Primary Technical Bottlenecks & Failure Modes',
        '3. Required Quantitative Variables & Thresholds to Measure',
        '4. Recommended Software/Virtual Simulation Next Step (before physical hardware or wet-lab build)',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      });

      const report = response.text?.trim();
      if (!report) {
        return res.status(502).json({ error: 'Feasibility audit returned an empty response. Please try again.' });
      }
      return res.json({ report, mode: 'gemini' });
    } catch (err: any) {
      console.error('Gemini PoC audit error:', err);
      const status = typeof err?.status === 'number' ? err.status : 502;
      return res.status(status).json({
        error: 'Unable to complete AI feasibility audit right now. You can retry or run the offline first-principles checklist.',
      });
    }
  }

  const report = buildDeterministicAudit({
    title,
    domain,
    hypothesis,
    parameters,
    linkedPaperTitle,
  });

  return res.json({ report, mode: 'deterministic' });
});

router.get('/poc', requireAuth, async (req: AuthRequest, res) => {
  try {
    const pocs = await getPocsForUser(req.user!.uid);
    res.json({ pocs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load private PoCs' });
  }
});

router.post('/poc/save', requireAuth, async (req: AuthRequest, res) => {
  const poc = req.body?.poc as PocProjectInput | undefined;
  if (!poc?.id || !poc?.title || !poc?.hypothesis) {
    return res.status(400).json({ error: 'Valid PoC payload (id, title, hypothesis) is required.' });
  }

  try {
    await savePocForUser(req.user!.uid, req.user!.email || 'student@library.local', poc);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save private PoC' });
  }
});

router.post('/poc/sync', requireAuth, async (req: AuthRequest, res) => {
  const pocs = Array.isArray(req.body?.pocs) ? (req.body.pocs as PocProjectInput[]) : [];
  try {
    for (const poc of pocs) {
      if (poc?.id && poc?.title && poc?.hypothesis) {
        await savePocForUser(req.user!.uid, req.user!.email || 'student@library.local', poc);
      }
    }
    const merged = await getPocsForUser(req.user!.uid);
    res.json({ pocs: merged });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync private PoCs' });
  }
});

router.patch('/poc/publish', requireAuth, async (req: AuthRequest, res) => {
  const pocId = String(req.body?.pocId || '').trim();
  const isPublic = Boolean(req.body?.isPublic);
  if (!pocId) {
    return res.status(400).json({ error: 'pocId is required' });
  }

  try {
    const result = await setPocPublicStatusForUser(req.user!.uid, pocId, isPublic);
    if (!result.found) {
      return res.status(404).json({ error: 'PoC blueprint not found for this account' });
    }
    res.json({ success: true, isPublic: result.isPublic });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update visibility' });
  }
});

router.delete('/poc/:pocId', requireAuth, async (req: AuthRequest, res) => {
  const pocId = decodeURIComponent(String(req.params.pocId || ''));
  if (!pocId) {
    return res.status(400).json({ error: 'pocId is required' });
  }

  try {
    await deletePocForUser(req.user!.uid, pocId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete PoC' });
  }
});

router.get('/poc-showcase', async (_req, res) => {
  try {
    const showcase = await getPublicShowcasePocs(30);
    res.json({ showcase });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load public showcase' });
  }
});

export default router;
