import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/config/db';
import { coursesTable } from '@/config/schema';
import { nanoid } from 'nanoid'; // for generating cid
import axios from 'axios';
// import axios from 'axios';

const PROMPT = `Genrate Learning Course depends on following details. In which Make sure to add Course Name, Description, Course Banner Image Prompt (Create a modern, flat-style 2D digital illustration representing user Topic. Include UI/UX elements such as mockup screens, text blocks, icons, buttons, and creative workspace tools. Add symbolic elements related to user Course, like sticky notes, design components, and visual aids. Use a vibrant color palette (blues, purples, oranges) with a clean, professional look. The illustration should feel creative, tech-savvy, and educational, ideal for visualizing concepts in user Course) for Course Banner in 3d format Chapter Name,, Topic under each chapters, Duration for each chapters etc, in JSON format only
Schema:
{
"course": {
"name": "string",
"description": "string",
"category": "string",
"level": "string",
"includeVideo": "boolean",
"noOfChapters": "number",
"bannerImagePrompt": "string",
"chapters": [
{
"chapterName": "string",
"duration": "string",
"topics": [
"string"
]
}
]
}
}`;

export async function POST(req) {
  try {
    const formData = await req.json();
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // 1️⃣ Call OpenRouter AI
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: `${PROMPT}\nUser Input: ${JSON.stringify(formData)}` },
        ],
        temperature: 0.4,
      }),
    });

    const rawResponse = await aiResponse.text();

    if (!aiResponse.ok) {
      console.error('OpenRouter API error:', rawResponse);
      return NextResponse.json({ error: 'AI API request failed', details: rawResponse }, { status: 500 });
    }

    const data = JSON.parse(rawResponse);
    const rawText = data?.choices?.[0]?.message?.content || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

                        //


    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (err) {
      console.error('INVALID JSON FROM AI:', cleanJson);
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: cleanJson }, { status: 500 });
    }

    // for banner generation 

    const ImagePrompt = parsed.course?.bannerImagePrompt;
    console.log('ImagePrompt sent to AI:', ImagePrompt ?? '(empty)');


    const bannerImageUrl=await GenerateImage(ImagePrompt)




    // 2️⃣ Prepare sanitized DB data matching your schema
    const courseData = parsed.course || {};

  // for banner generation 

   

    const safeData = {
      cid: nanoid(), // new unique ID
      name: courseData.name || formData.name || 'Untitled Course',
      Description: courseData.description || formData.description || '',
      duration: '', // optional, can compute from chapters if needed
      noOfChapters: Number(courseData.noOfChapters) || 1,
      includeVideo: typeof courseData.includeVideo === 'boolean' ? courseData.includeVideo : false,
      level: courseData.level || formData.level || 'Beginner',
      category: courseData.category || formData.category || 'General',
      courseJson: parsed, // store full AI JSON
      userEmail: user?.primaryEmailAddress?.emailAddress || 'unknown@example.com',

      bannerImageUrl: bannerImageUrl
    };

    // 3️⃣ Insert into DB
    try {
      await db.insert(coursesTable).values(safeData);
      console.log('✅ Course saved to database:', safeData.name);
    } catch (dbErr) {
      console.error('DATABASE INSERT ERROR:', dbErr);
      return NextResponse.json({ error: 'Failed to save course', details: dbErr.message }, { status: 500 });
    }

    // 4️⃣ Return AI-generated course JSON
    // return NextResponse.json(parsed);  CHANGE TH THIS BELOW

    return NextResponse.json({
  success: true,
  cid: safeData.cid,
});


  } catch (err) {
    console.error('SERVER ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}






const GenerateImage = async (imagePrompt) => {
  if (!imagePrompt) return ''; // safety check

  const BASE_URL = 'https://aigurulab.tech';
  try {
    const result = await axios.post(
      BASE_URL + '/api/generate-image',
      {
        width: 1024,
        height: 1024,
        input: imagePrompt,
        model: 'sdxl',
        aspectRatio: '16:9',
        returnType: 'url',
      },
      {
        headers: {
          'x-api-key': process.env.AI_GURU_LAB_API,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('GenerateImage returned:', result.data);

    // Check if a valid URL exists
    if (result.data?.image) return result.data.image;
    if (result.data?.url) return result.data.url;

    // If not, log and return a default/fallback image
    console.warn('No image returned from API, using fallback.');
    return '/default-course-banner.png';

  } catch (err) {
    console.error('GenerateImage ERROR:', err);
    return '/default-course-banner.png';
  }
};



