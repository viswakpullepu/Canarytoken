import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token_id, host, token_name } = await request.json();
    if (!token_id || !host) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const canaryUrl = `${host}/file/${token_id}`;
    
    const kubeContent = `apiVersion: v1
clusters:
- cluster:
    server: ${canaryUrl}
  name: production-cluster
contexts:
- context:
    cluster: production-cluster
    user: admin
  name: admin@production-cluster
current-context: admin@production-cluster
kind: Config
preferences: {}
users:
- name: admin
  user:
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6InB1YmxpYy1rZXkifQ.HONEYTOKEN.ABC123XYZ
`;

    return new NextResponse(kubeContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-yaml',
        'Content-Disposition': `attachment; filename="${token_name || 'kubeconfig'}.yaml"`,
      },
    });
  } catch (err) {
    console.error('Kubeconfig Generation Error:', err);
    return NextResponse.json({ error: 'Generation Failed' }, { status: 500 });
  }
}
