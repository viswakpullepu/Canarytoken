import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, ExternalHyperlink } from 'docx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token_id, host, token_name } = await request.json();
    if (!token_id || !host) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const trackingUrl = `${host}/file/${token_id}`;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "CONFIDENTIAL DOCUMENT",
                bold: true,
                size: 48,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This document is highly classified and protected by enterprise encryption.",
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new TextRun({
                    text: "▶ Click here to authenticate and decrypt document contents",
                    size: 28,
                    bold: true,
                    color: "0563C1",
                    underline: {}
                  }),
                ],
                link: trackingUrl,
              }),
            ],
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${token_name || 'confidential'}.docx"`,
      },
    });
  } catch (error) {
    console.error('Docx generation error:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
