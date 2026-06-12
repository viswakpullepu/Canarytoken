import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const { token_id, host, token_name } = await request.json();
    if (!token_id || !host) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('CONFIDENTIAL DOCUMENT', {
      x: 50,
      y: 350,
      size: 24,
      font: helveticaFont,
      color: rgb(0.8, 0.1, 0.1),
    });

    page.drawText('This document is encrypted for security purposes.', {
      x: 50,
      y: 300,
      size: 14,
      font: textFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('To view the contents of this file, you must verify your identity.', {
      x: 50,
      y: 270,
      size: 14,
      font: textFont,
      color: rgb(0, 0, 0),
    });

    const canaryUrl = `${host}/file/${token_id}`;
    
    // Draw button background
    page.drawRectangle({
      x: 50,
      y: 200,
      width: 200,
      height: 40,
      color: rgb(0.1, 0.4, 0.8),
    });

    // Draw button text
    page.drawText('Click to Decrypt File', {
      x: 75,
      y: 215,
      size: 14,
      font: helveticaFont,
      color: rgb(1, 1, 1),
    });

    // Create invisible link over the button
    const linkAnnotation = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [50, 200, 250, 240],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: canaryUrl,
      },
    });

    const linkRef = pdfDoc.context.register(linkAnnotation);
    page.node.set(
      pdfDoc.context.obj('Annots'),
      pdfDoc.context.obj([linkRef])
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${token_name || 'confidential'}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF Generation Error:', err);
    return NextResponse.json({ error: 'PDF Generation Failed' }, { status: 500 });
  }
}
