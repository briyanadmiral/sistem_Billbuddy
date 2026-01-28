import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Use AI to extract receipt data
    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Image}`,
            },
            {
              type: 'text',
              text: `Analyze this receipt image and extract the following information in JSON format:
{
  "items": [
    {
      "name": "item name",
      "quantity": 1,
      "unit_price": 10000,
      "total_price": 10000
    }
  ],
  "subtotal": 0,
  "tax": 0,
  "service_charge": 0,
  "discount": 0,
  "total": 0
}

Rules:
- All prices should be numbers without currency symbols
- If quantity is not visible, assume 1
- If subtotal is not visible, calculate from items
- If tax/service_charge/discount is not visible, use 0
- Extract ALL items visible on the receipt
- Use Indonesian language for item names if the receipt is in Indonesian
- Return ONLY the JSON, no other text`,
            },
          ],
        },
      ],
    })

    // Parse the JSON response
    let parsedData
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedText = text.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      parsedData = JSON.parse(cleanedText.trim())
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse receipt data', raw: text },
        { status: 500 }
      )
    }

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    )
  }
}
