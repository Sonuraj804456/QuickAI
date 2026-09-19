import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import connectCloudinary from "../configs/cloudinary.js";
import { v2 as cloudinary } from "cloudinary"
import FormData from "form-data";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import fs from "fs";
const AI = {
  get chat() {
    return new OpenAI({
      apiKey: process.env.Gemini_API_Key,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    }).chat;
  }
};

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue."
      });
    }

    const response = await AI.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: Math.round(length * 7.5),
    });

    const content = response.choices[0].message.content;

await sql`
  INSERT INTO creations (user_id, prompt, content, type)
  VALUES (${userId}, ${prompt}, ${content}, 'article');
`;

if (plan !== "premium") {
  await clerkClient.users.updateUserMetadata(userId, {
    privateMetadata: {
      free_usage: free_usage + 1
    }
  });
}

res.json({
  success: true,
  content
});


  } catch (error) {
    console.log(error.message);
    res.json({
        success: false,
        message: error.message
    })
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue."
      });
    }

    const response = await AI.chat.completions.create({
    model: "gemini-3-flash-preview",
    messages: [
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: 10000,
    });

    const content = response.choices[0].message.content;

await sql`
  INSERT INTO creations (user_id, prompt, content, type)
  VALUES (${userId}, ${prompt}, ${content}, 'blog-title');
`;

if (plan !== "premium") {
  await clerkClient.users.updateUserMetadata(userId, {
    privateMetadata: {
      free_usage: free_usage + 1
    }
  });
}

res.json({
  success: true,
  content
});


  } catch (error) {
    console.log(error.message);
    res.json({
        success: false,
        message: error.message
    })
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;


    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium users."
      });
    }

    const formData = new FormData()
    formData.append('prompt', prompt);
    const {data}=await axios.post('https://clipdrop-api.co/text-to-image/v1',formData,{
        headers: {'x-api-key': process.env.CLIPDROP_API_KEY,},
        responseType: 'arraybuffer'
    })
    

    const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql`
    INSERT INTO creations (user_id, prompt, content, type, publish)
    VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;


    res.json({
    success: true,
    content:secure_url
    });


  } catch (error) {
    console.log(error.message);
    res.json({
        success: false,
        message: error.message
    })
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file;
    const plan = req.plan;


    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium users."
      });
    }

    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: 'background_removal',
          background_removal: 'remove_the_background'
        }
      ]
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    res.json({
    success: true,
    content:secure_url
    });


  } catch (error) {
    console.log(error.message);
    res.json({
        success: false,
        message: error.message
    })
  }
};

export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;


    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium users."
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      transformation: [
        { effect: `gen_remove:${object}` }
      ],
      resource_type: 'image'
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

    res.json({ success: true, content: imageUrl });


  } catch (error) {
    console.log(error.message);
    res.json({
        success: false,
        message: error.message
    })
  }
};

export const resumeReview = async (req, res) => {
  let tempFilePath = null;
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const { jobDescription } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only available for premium users."
      });
    }

    if (!resume) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume PDF file."
      });
    }

    tempFilePath = resume.path;

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "File size exceeds 5MB limit."
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

    let prompt = "";
    let promptTitle = "Review the uploaded resume";

    if (jobDescription && jobDescription.trim()) {
      promptTitle = "ATS Job-Matched Resume Review";
      prompt = `You are a Senior Technical Recruiter and an advanced ATS (Applicant Tracking System) Scanner.
Analyze the following Candidate Resume against the Target Job Description below.

Target Job Description:
${jobDescription.trim()}

Candidate Resume Content:
${pdfData.text}

Provide an in-depth, structured evaluation in GitHub-flavored Markdown with the following sections:
1. **🎯 Overall ATS Match Score**: Give an exact score out of 100 with a 1-sentence executive summary.
2. **✅ Key Matched Qualifications & Strengths**: Bullet points of qualifications directly matching the target job.
3. **⚠️ Critical Missing Keywords & Skills**: Must-have requirements in the JD that are absent or under-emphasized in the resume.
4. **💡 Line-by-Line Resume Optimizations**: Specific bullet points from the resume rewritten with stronger action verbs and quantifiable metrics.
5. **📋 Strategic Interview Recommendations**: Key potential concerns an interviewer might probe based on the candidate's gaps.`;
    } else {
      prompt = `You are a Senior Career Coach and Technical Recruiter.
Review the following resume and provide constructive, structured feedback on its strengths, weaknesses, formatting, impact metrics, and areas for improvement.

Resume Content:
${pdfData.text}`;
    }

    let response;
    try {
      response = await AI.chat.completions.create({
        model: "gemini-3.6-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 10000,
      });
    } catch (err36) {
      console.warn("gemini-3.6-flash failed in resumeReview, trying gemini-3-flash-preview:", err36.message);
      response = await AI.chat.completions.create({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 10000,
      });
    }

    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${promptTitle}, ${content}, 'resume-review')
    `;

    res.json({ success: true, content });

  } catch (error) {
    console.error("Resume Review Error:", error.message);
    const is403 = error.status === 403 || String(error.message).includes("403");
    const userMessage = is403
      ? "Gemini API Key was reported as leaked/blocked by Google. Please generate a fresh free key at https://aistudio.google.com/app/apikey and update server/.env"
      : error.message;
    res.json({
      success: false,
      message: userMessage
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.warn("Could not delete temp resume file:", err.message);
      }
    }
  }
};
