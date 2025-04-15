import { NextRequest, NextResponse } from "next/server";
import { generateChatCompletion } from "@/lib/aiClient";

export async function POST(req: NextRequest) {
  try {
    const { fileUrl } = await req.json();
    console.log("Process API received fileUrl:", fileUrl);

    if (!fileUrl) {
      return NextResponse.json(
        { error: "No file URL provided" },
        { status: 400 }
      );
    }

    // 1. Get file content from URL
    const fullUrl = fileUrl.startsWith('http') 
      ? fileUrl 
      : new URL(fileUrl, process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || '3001'}`).toString();
    
    console.log("Attempting to fetch file from:", fullUrl);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error(`Failed to fetch file: ${response.statusText}, Status: ${response.status}`);
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const content = await response.text();

    // Extract filename from URL
    const filename = new URL(fileUrl).pathname.split('/').pop() || 'unknown.pdf';

    // 2. Generate summary using AI
    const aiSummary = await generateChatCompletion({
      model: 'GPT_4O_MINI',
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise summaries of samba notation documents. Generate a summary that captures the key patterns and rhythm notations."
        },
        {
          role: "user",
          content: `Please analyze this samba notation and provide a summary:\n\n${content.substring(0, 5000)}`
        }
      ]
    });

    // 3. Generate mnemonics
    const mnemonicsPrompt = `
      Analyze the following samba notation and create memorable mnemonics to help remember the rhythmic patterns:
      
      ${content.substring(0, 5000)}
      
      For each distinct pattern, create a mnemonic with these properties:
      1. The pattern - describe the actual rhythm notation
      2. The mnemonic - a word or phrase that helps remember the rhythm
      3. A description of how the mnemonic relates to the pattern
      
      Return your response in the following format:
      [
        {
          "pattern": "pattern description",
          "mnemonic": "mnemonic phrase",
          "description": "explanation"
        }
      ]
    `;

    const mnemonicsResponse = await generateChatCompletion({
      model: 'GPT_4O_MINI',
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates memorable mnemonics for samba rhythms and notation. Return your response as a JSON array."
        },
        {
          role: "user",
          content: mnemonicsPrompt
        }
      ]
    });

    // Parse the mnemonics response
    let mnemonics = [];
    try {
      // Check if the response looks like a JSON array
      const cleanedResponse = mnemonicsResponse.trim();
      if (cleanedResponse.startsWith('[') && cleanedResponse.endsWith(']')) {
        // Try to parse the JSON response
        mnemonics = JSON.parse(cleanedResponse);
      } else if (cleanedResponse.includes('```json')) {
        // Handle markdown code blocks with JSON
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          mnemonics = JSON.parse(jsonMatch[1].trim());
        }
      } else {
        // If response is not JSON, create a simple fallback mnemonic
        console.warn("Mnemonics response was not in JSON format:", cleanedResponse);
        mnemonics = [
          {
            pattern: "Basic pattern",
            mnemonic: "Example mnemonic",
            description: "This is a fallback mnemonic since the AI response was not in JSON format"
          }
        ];
      }
      
      // Ensure it's an array
      if (!Array.isArray(mnemonics)) {
        console.warn("Parsed mnemonics is not an array:", mnemonics);
        mnemonics = [];
      }
    } catch (error) {
      console.error("Error parsing mnemonics JSON:", error);
      // Provide fallback mnemonics
      mnemonics = [
        {
          pattern: "Example pattern",
          mnemonic: "Example mnemonic",
          description: "This is a fallback mnemonic since there was an error parsing the AI response"
        }
      ];
    }

    return NextResponse.json({
      filename,
      aiSummary,
      mnemonics
    });
  } catch (error: any) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred processing the file" },
      { status: 500 }
    );
  }
}
