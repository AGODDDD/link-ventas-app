import { GET } from '../app/api/pedidos/ticket/route'
import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

async function test() {
  console.log('Testing custom fonts GET handler locally with ID: BARR-200526-2309')
  const req = new NextRequest('http://localhost:3000/api/pedidos/ticket?id=BARR-200526-2309')
  
  try {
    const response = await GET(req)
    console.log('Response Status:', response.status)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.status === 200) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const outputPath = path.join(__dirname, 'test_ticket.pdf')
      fs.writeFileSync(outputPath, buffer)
      console.log('PDF generated successfully with custom fonts at:', outputPath)
    } else {
      const text = await response.text()
      console.log('Response Error Body:', text)
    }
  } catch (err) {
    console.error('Runtime exception in handler:', err)
  }
}

test()
