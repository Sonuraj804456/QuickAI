import axios from "axios";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";

/**
 * Autonomous Deep Web Research Agent powered by LangChain
 * Implements ReAct reasoning loops (Thought -> Action -> Observation -> Final Synthesis)
 */
export const runDeepResearch = async (topic, depth = "standard") => {
  const apiKey = process.env.Gemini_API_Key;
  if (!apiKey) {
    throw new Error("Gemini_API_Key is not configured on the server.");
  }

  const collectedSources = [];
  const agentSteps = [];

  // Tool 1: Live Web News & Search Tool
  const searchWebTool = tool(
    async ({ query }) => {
      agentSteps.push(`Searching live web intelligence for: "${query}"`);
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const res = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; QuickAI-ResearchAgent/1.0)" },
          timeout: 8000
        });

        const items = [...res.data.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/g)].slice(0, 4);

        if (items.length === 0) {
          return "No recent web news articles found for this specific query.";
        }

        const results = items.map((m) => {
          const rawTitle = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
          const cleanUrl = m[2].trim();
          const date = m[3].trim();
          collectedSources.push({ title: rawTitle, url: cleanUrl, date });
          return { title: rawTitle, url: cleanUrl, date };
        });

        return JSON.stringify(results);
      } catch (err) {
        return `Web search failed: ${err.message}`;
      }
    },
    {
      name: "search_web",
      description: "Searches the live web for recent news, market developments, competitors, and trends.",
      schema: z.object({ query: z.string().describe("Specific search query") })
    }
  );

  // Tool 2: Encyclopedic Knowledge & Company Overview Tool
  const searchWikipediaTool = tool(
    async ({ topic }) => {
      agentSteps.push(`Consulting encyclopedic knowledge for: "${topic}"`);
      try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, {
          headers: { "User-Agent": "QuickAI-ResearchAgent/1.0 (engineering@quickai.io)" },
          timeout: 6000
        });

        if (res.data?.extract) {
          const entry = {
            title: res.data.title,
            extract: res.data.extract,
            url: res.data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`
          };
          collectedSources.push({
            title: `${res.data.title} (Wikipedia)`,
            url: entry.url,
            snippet: res.data.extract.slice(0, 180) + "..."
          });
          return JSON.stringify(entry);
        }
        return `No direct Wikipedia entry found for "${topic}".`;
      } catch (err) {
        return `Wikipedia lookup error: ${err.message}`;
      }
    },
    {
      name: "search_wikipedia",
      description: "Searches Wikipedia for formal definitions, business background, history, and foundational metrics.",
      schema: z.object({ topic: z.string().describe("Topic or entity name to look up") })
    }
  );

  // Tool 3: Web Page Deep Content Reader Tool
  const readWebpageTool = tool(
    async ({ url }) => {
      agentSteps.push(`Browsing and reading full article at: ${url.slice(0, 50)}...`);
      try {
        const res = await axios.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          timeout: 6000,
          maxContentLength: 500000
        });

        if (typeof res.data === "string") {
          const stripped = res.data
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          return stripped.slice(0, 1500);
        }
        return "Unable to parse text from target URL.";
      } catch (err) {
        return `Webpage read error: ${err.message}`;
      }
    },
    {
      name: "read_webpage",
      description: "Reads the raw textual content of a specific web URL discovered during research.",
      schema: z.object({ url: z.string().describe("The HTTP/HTTPS URL of the article to read") })
    }
  );

  const tools = [searchWebTool, searchWikipediaTool, readWebpageTool];

  // Initialize LangChain Chat Model
  let model;
  try {
    model = new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-3.6-flash",
      temperature: 0.25
    });
  } catch (initErr) {
    model = new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-3-flash-preview",
      temperature: 0.25
    });
  }

  const boundModel = model.bindTools(tools);

  const systemInstructions = `You are QuickAI's Autonomous Deep Research Agent.
Your objective is to conduct thorough, factual, and deeply analytical market/technical research on the user's requested topic.
Use the available tools (search_web, search_wikipedia, read_webpage) to discover verified facts, real-time news, metrics, and background before answering.

Structure your final response in clean GitHub-flavored Markdown with the following mandatory sections:
# [Topic Title] - Deep Intelligence & Research Report
*Executive Research Dossier generated by QuickAI Autonomous Agent*

## 1. 📌 Executive Summary
High-level strategic briefing and core thesis (2-3 paragraphs).

## 2. 📊 Market Dynamics, Recent Developments & Timeline
Key recent milestones, market shifts, news, and funding or operational stats.

## 3. 🔬 Technical Architecture, Business Model & Core Strengths
Detailed technical or operational breakdown of how the entity/concept operates.

## 4. ⚖️ Competitive Landscape & Comparative Analysis
Direct comparison with industry alternatives, pros/cons, or SWOT analysis.

## 5. 🔮 Strategic Implications & Future Outlook
Projections, opportunities, potential risks, and future trajectory.

## 6. 🔗 Verified Sources & Citations
List the verified reference sources with active clickable Markdown links: [Source Title](URL).`;

  let messages = [
    { role: "system", content: systemInstructions },
    { role: "user", content: `Conduct comprehensive deep research on: "${topic}". Depth mode: ${depth}.` }
  ];

  agentSteps.push(`Formulating research plan for: "${topic}"`);

  // ReAct Loop (Up to 3 tool interaction cycles)
  let maxCycles = depth === "comprehensive" ? 3 : 2;
  let cycle = 0;

  while (cycle < maxCycles) {
    cycle++;
    const aiResponse = await boundModel.invoke(messages);
    messages.push(aiResponse);

    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      for (const call of aiResponse.tool_calls) {
        const matchingTool = tools.find((t) => t.name === call.name);
        let observation = "Tool not found.";
        if (matchingTool) {
          try {
            observation = await matchingTool.invoke(call.args);
          } catch (tErr) {
            observation = `Tool error: ${tErr.message}`;
          }
        }

        messages.push(
          new ToolMessage({
            tool_call_id: call.id,
            content: typeof observation === "string" ? observation : JSON.stringify(observation)
          })
        );
      }
    } else {
      // Agent has finished autonomously
      break;
    }
  }

  agentSteps.push("Synthesizing multi-source findings into final research report...");

  // Final Synthesis Step: use plain model (no tools bound) so it cannot call tools again
  messages.push({
    role: "user",
    content:
      "IMPORTANT: Do NOT call any tools. Based solely on all the research observations above, write the final, complete Markdown research report now following the requested 6-section structure. Output only the Markdown report text."
  });

  /**
   * Extract a plain string from whatever LangChain returns.
   * ChatGoogleGenerativeAI can return content as:
   *   • string  → model gave a direct text answer
   *   • Array   → model still tried to call tools (each element has {type, functionCall} or {type, text})
   * We pick only the "text" parts; if none exist we do one forced re-call.
   */
  const extractText = (content) => {
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "text" || typeof c === "string")
        .map((c) => (typeof c === "string" ? c : c.text || ""))
        .join("\n")
        .trim();
    }
    return "";
  };

  let finalResponse = await model.invoke(messages);
  let report = extractText(finalResponse.content);

  // If the model still returned only tool-call objects (no text), force a plain-text synthesis
  if (!report) {
    agentSteps.push("Forcing plain-text synthesis (model attempted extra tool call)...");
    const forcedResponse = await model.invoke([
      {
        role: "system",
        content:
          "You are a research report writer. Write ONLY plain Markdown text. Do NOT call any tools or functions."
      },
      {
        role: "user",
        content: `Write a detailed Markdown research report about "${topic}" using the knowledge you already have. Follow this 6-section structure:\n1. Executive Summary\n2. Market Dynamics & Recent Developments\n3. Technical Architecture & Business Model\n4. Competitive Landscape\n5. Strategic Implications & Future Outlook\n6. Verified Sources & Citations`
      }
    ]);
    report = extractText(forcedResponse.content) || "Report generation failed — please retry.";
  }

  // De-duplicate collected sources
  const seenUrls = new Set();
  const uniqueSources = [];
  for (const s of collectedSources) {
    if (s.url && !seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      uniqueSources.push(s);
    }
  }

  return {
    report,
    sources: uniqueSources.slice(0, 8),
    steps: agentSteps
  };
};
