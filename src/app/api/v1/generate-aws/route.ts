import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token_id, host } = await request.json();
    if (!token_id || !host) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const canaryUrl = `${host}/file/${token_id}`;
    
    const awsContent = `[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAHONEYTOKENEXAMPLE
aws_secret_access_key = ${canaryUrl}
region = us-east-1
`;

    return new NextResponse(awsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="credentials"`,
      },
    });
  } catch (err) {
    console.error('AWS Config Generation Error:', err);
    return NextResponse.json({ error: 'Generation Failed' }, { status: 500 });
  }
}
