import { z } from "zod"

const QuestionSchema = z.object({
  question_text: z.string().describe("The quiz question"),
  question_type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT"]).describe("The type of question"),
  time_limit: z.number().default(30).describe("Time limit in seconds"),
  points: z.number().default(1000).describe("Points for correct answer"),
  answer_options: z
    .array(
      z.object({
        option_text: z.string().describe("The answer option text"),
        is_correct: z.boolean().describe("Whether this is the correct answer"),
        order_index: z.number().describe("Display order of this option"),
      }),
    )
    .min(2)
    .describe("Between 2 and 6 answer options")
    .refine(
      (options) => {
        const texts = options.map((o) => o.option_text.trim().toLowerCase())
        return new Set(texts).size === texts.length
      },
      { message: "Answer options must be unique" },
    ),
})

const QuizSchema = z.object({
  questions: z.array(QuestionSchema).describe("Array of quiz questions"),
})

// Function to clean JSON string from potential markdown code blocks
function cleanJsonString(str: string): string {
  if (str.includes("```json")) {
    return str.split("```json")[1].split("```")[0].trim()
  }
  if (str.includes("```")) {
    return str.split("```")[1].split("```")[0].trim()
  }
  return str.trim()
}

export async function POST(request: Request) {
  try {
    const { mode, input, numQuestions, questionType } = await request.json()

    // Define constraints based on requested type
    let typeInstructions = ""
    if (questionType === "TRUE_FALSE") {
      typeInstructions = `
        All questions must be of type "TRUE_FALSE".
        Each question must have exactly 2 answer options: "True" and "False".
        Set "question_type" to "TRUE_FALSE".`
    } else if (questionType === "MULTIPLE_SELECT") {
      typeInstructions = `
        All questions must be of type "MULTIPLE_SELECT".
        Ensure there are multiple correct answers (at least 2).
        Set "question_type" to "MULTIPLE_SELECT".`
    } else if (questionType === "MULTIPLE_CHOICE") {
      typeInstructions = `
        All questions must be of type "MULTIPLE_CHOICE".
        Ensure there is exactly one correct answer.
        Set "question_type" to "MULTIPLE_CHOICE".`
    } else {
      // MIXED
      typeInstructions = `
        Generate a mix of "MULTIPLE_CHOICE", "TRUE_FALSE", and "MULTIPLE_SELECT" questions.
        For "TRUE_FALSE" questions, ensure options are just "True" and "False".
        For "MULTIPLE_SELECT", ensure multiple correct answers.
        Set "question_type" appropriately for each.`
    }

    const prompt =
      mode === "topic"
        ? `Generate ${numQuestions} quiz questions about the topic: "${input}". 
           Return ONLY a JSON object with a single key "questions" which is an array of questions.
           Each question must have: "question_text", "question_type", "time_limit" (number), "points" (number, set to 1000), and "answer_options" (array of Objects).
           Each answer option must have: "option_text", "is_correct" (boolean), "order_index" (number).
           
           ${typeInstructions}

           Make the questions educational, clear, and appropriate for a classroom setting.
           Include a mix of difficulty levels from easy to challenging.
           The distractors (wrong answers) should be plausible but clearly incorrect.
           CRITICAL: Ensure all answer options are distinct and unique. Do not repeat the same answer text.
           CRITICAL: Ensure the correct answer is factually accurate and unambiguous. Double-check facts before generating.
           CRITICAL: VERIFY matching correct answers. Ensure is_correct is strictly true ONLY for the actual correct answer.
           Set all question points to 1000.
           Do not include any explanation or markdown formatting, just the raw JSON.`
        : `Generate ${numQuestions} quiz questions based on the following text:
           
           "${input}"
           
           Return ONLY a JSON object with a single key "questions" which is an array of questions.
            Each question must have: "question_text", "question_type", "time_limit" (number), "points" (number, set to 1000), and "answer_options" (array of Objects).
           Each answer option must have: "option_text", "is_correct" (boolean), "order_index" (number).
           
           ${typeInstructions}

           Questions should test comprehension and key facts from the text.
           The distractors (wrong answers) should be plausible but clearly incorrect.
           CRITICAL: Ensure all answer options are distinct and unique. Do not repeat the same answer text.
           CRITICAL: Ensure the correct answer is factually accurate based on the text provided.
           CRITICAL: VERIFY matching correct answers. Ensure is_correct is strictly true ONLY for the actual correct answer.
           Set all question points to 1000.
           Do not include any explanation or markdown formatting, just the raw JSON.`

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY")
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Using a reliable model via OpenRouter
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" }, // Enforce JSON mode if supported
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json()
    const content = result.choices[0].message.content

    if (!content) {
      throw new Error("No content received from AI")
    }

    const cleanedJson = cleanJsonString(content)
    const parsedData = JSON.parse(cleanedJson)
    const validData = QuizSchema.parse(parsedData)

    // Shuffle answer options to randomize correct answer position
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    const questions = validData.questions.map((q, qIdx) => ({
      ...q,
      order_index: qIdx,
      answer_options: shuffleArray(q.answer_options).map((a, aIdx) => ({
        ...a,
        order_index: aIdx,
      })),
    }))

    return Response.json({ questions })
  } catch (error) {
    console.error("Quiz generation error:", error)
    return Response.json({ error: "Failed to generate quiz questions" }, { status: 500 })
  }
}
