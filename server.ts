import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PROJECT_LIST = [
  { id: 'proj_natraju', name: 'NATRAJU', aliases: ['natraju', 'natraj'] },
  { id: 'proj_br', name: 'BR', aliases: ['br', 'b r'] },
  { id: 'proj_br_2', name: 'BR-2', aliases: ['br-2', 'br 2', 'br2'] },
  { id: 'proj_200_cents', name: '200 CENTS', aliases: ['200 cents', '200cents', '200 cent'] },
  { id: 'proj_sr', name: 'SR', aliases: ['sr', 's r'] },
  { id: 'proj_sr_2', name: 'SR-2', aliases: ['sr-2', 'sr 2', 'sr2'] },
  { id: 'proj_rk', name: 'RK', aliases: ['rk', 'r k'] },
  { id: 'proj_babul_reddy_syte', name: 'BABUL REDDY SYTE', aliases: ['babul', 'babul reddy', 'babul site', 'babul syte'] },
  { id: 'proj_boru_ramasubbareddy', name: 'BORU RAMASUBBAREDDY', aliases: ['boru', 'ramasubbareddy', 'boru ramasubbareddy'] },
  { id: 'proj_25_cents', name: '25 CENTS', aliases: ['25 cents', '25cents', '25 cent'] },
  { id: 'proj_47_cents', name: '47 CENTS', aliases: ['47 cents', '47cents', '47 cent'] },
  { id: 'proj_49_cents', name: '49 CENTS', aliases: ['49 cents', '49cents', '49 cent'] },
];

const SYSTEM_INSTRUCTION = `
You are JERRY, a professional, friendly, and expert AI Accountant for a real estate business.
You understand Telugu, Telugu written in English script (Manglish/Telugish, e.g., "Personal account lo 5000 house maintenance cash expense", "BABUL REDDY SYTE ki 25000 investment HDFC nunchi", "Ramesh ki 10000 cash ichanu, soil purchase kosam"), English, and Hindi.

Your primary duty is to parse conversational accounting instructions accurately and prepare transaction drafts for explicit user confirmation before saving.

CRITICAL RULES:
1. PROJECTS & ALIASES:
   - There are exactly 12 projects: NATRAJU, BR, BR-2, 200 CENTS, SR, SR-2, RK, BABUL REDDY SYTE, BORU RAMASUBBAREDDY, 25 CENTS, 47 CENTS, 49 CENTS.
   - "Babul", "babul", "Babul Reddy", "babul syte" is an alias for "BABUL REDDY SYTE" (ID: proj_babul_reddy_syte). Never invent a separate project for Babul.
2. PERSONAL A/C VS PROJECT A/C:
   - Personal A/c records the owner's personal receipts and payments.
     - Required: Date, To/From or Particulars, DR/CR, Payment Mode (CASH, HDFC, SBI, UNION or splits), Amount.
     - Payments/Expenses are DR. Receipts/Income are CR.
   - Project A/c records project ledger transactions.
     - Required: Date, Particulars/Purpose, DR or CR Amount, Who (partner/person).
     - Payment mode is optional in project ledgers.
     - Contributions/Investment received into project = CR.
     - Expenses/Payments out of project = DR.
3. PERSONAL-TO-PROJECT INVESTMENT LINKING:
   - If user says: "BABUL REDDY SYTE ki 25000 investment HDFC nunchi" or transfers personal money to a project:
     - Mark isLinkedInvestment = true.
     - Source: Personal A/c (DR from HDFC).
     - Destination Project: BABUL REDDY SYTE (CR).
     - linkedDestinationProjectId: "proj_babul_reddy_syte".
4. STRICT INCOMPLETE ENTRY GUARD:
   - If the user sends only an amount (e.g. "25000" or "5000"):
     - DO NOT MARK DRAFT READY (isReady: false).
     - DO NOT GUESS OR INVENT DETAILS.
     - Ask a polite follow-up in Telugu/English asking what the amount represents (purpose, person, payment mode, or account).
5. DETERMINISTIC FORMAT:
   - Return valid JSON matching the specified schema.
   - Explanation should be warm and clear in Telugu and English.
`;

app.post('/api/jerry-chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      currentAccountType,
      currentProjectId,
      currentProjectName,
      activeDraft,
      chatHistory,
      todayDate,
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const promptContext = `
Context:
- Currently selected account: ${currentAccountType === 'personal' ? 'Personal A/c' : `Project: ${currentProjectName || currentProjectId}`}
- Today's date: ${todayDate || new Date().toISOString().split('T')[0]}
- Active draft from previous message (if any): ${JSON.stringify(activeDraft || null)}
- Recent chat history: ${JSON.stringify((chatHistory || []).slice(-4))}

User Message: "${message}"

Respond strictly with a JSON object with this exact shape:
{
  "messageText": "string (Friendly explanation in Telugu and English)",
  "actionType": "draft" | "inquiry" | "clarification" | "general",
  "draft": {
    "isReady": boolean (true ONLY if all required fields are present and clear, false if missing fields or amount-only),
    "accountType": "personal" | "project",
    "projectId": string (e.g. "proj_babul_reddy_syte" if project),
    "projectName": string,
    "date": "YYYY-MM-DD",
    "type": "DR" | "CR",
    "amount": number,
    "particulars": string,
    "toFrom": string,
    "who": string,
    "paymentModes": [{"mode": "CASH"|"HDFC"|"SBI"|"UNION", "amount": number}],
    "remarks": string,
    "classification": "expense" | "income" | "investment" | "advance" | "loan" | "other",
    "isLinkedInvestment": boolean,
    "linkedDestinationProjectId": string,
    "linkedDestinationProjectName": string,
    "missingFields": string[],
    "followUpQuestion": string
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptContext,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = {
        messageText: responseText,
        actionType: 'general',
      };
    }

    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini API error in /api/jerry-chat:', err);
    res.status(500).json({
      error: 'AI assistant error',
      message: err?.message || 'Failed to process message with Jerry AI',
    });
  }
});

// Setup Vite in Dev or Static in Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`JERRY AI Accountant Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
